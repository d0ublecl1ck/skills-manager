import { StrictMode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { Skill } from "./types";
import { useAgentStore } from "./stores/useAgentStore";
import { useSkillStore } from "./stores/useSkillStore";
import { useSettingsStore } from "./stores/useSettingsStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("App", () => {
  afterEach(() => {
    cleanup();
    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });
    window.sessionStorage.clear();
    useAgentStore.getState().resetToDefaults();
    useSettingsStore.getState().resetSettings();
  });

  it("renders dashboard and can install a skill via tauri invoke", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 0,
      }),
    );

    const installedSkill: Skill = {
      id: "test-skill",
      name: "Test Skill",
      sourceUrl: "github.com/foo/bar",
      enabledAgents: [],
      lastSync: "2026-01-23T00:00:00Z",
      lastUpdate: "2026-01-23T00:00:00Z",
    };

    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === "bootstrap_skills_store") return Promise.resolve([] as unknown as never);
      if (cmd === "detect_startup_untracked_skills") return Promise.resolve([] as unknown as never);
      if (cmd === "install_skill_cli") return Promise.resolve(installedSkill as unknown as never);
      return Promise.resolve(undefined as never);
    });

    render(<App />);
    const user = userEvent.setup();

    expect(screen.getByText("Skills Manager")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "技能库" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "技能市场" }));
    expect(screen.getByRole("heading", { name: "安装新技能" })).toBeInTheDocument();

    const repoInput = screen.getByPlaceholderText(
      "github.com/用户/仓库 或 https://example.com/skill.zip",
    );
    await user.type(repoInput, "github.com/foo/bar");

    const installButton = screen.getByRole("button", { name: "安装" });
    await user.click(installButton);

    expect(await screen.findByText("确认技能信息")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认安装" }));

    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith("install_skill_cli", {
        repoUrl: "github.com/foo/bar",
        skillName: "bar",
        storagePath: "~/.skillsm",
      });
    });
    expect(screen.getByRole("button", { name: "安装" })).toBeInTheDocument();
    expect(repoInput).toHaveValue("");
  });

  it("navigates to marketplace when clicking dashboard add-skill button", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 0,
      }),
    );

    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === "bootstrap_skills_store") return Promise.resolve(undefined as never);
      if (cmd === "sync_all_to_manager_store") return Promise.resolve([] as unknown as never);
      return Promise.resolve(undefined as never);
    });

    render(<App />);
    const user = userEvent.setup();

    expect(screen.getByRole("heading", { name: "技能库" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加技能" }));

    expect(await screen.findByRole("heading", { name: "安装新技能" })).toBeInTheDocument();
  });

  it("opens sync modal and runs sync-all with progress events", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 0,
      }),
    );

    let progressHandler: ((event: { payload: unknown }) => void) | undefined;
    const unlisten = vi.fn();
    vi.mocked(listen).mockImplementation(async (event, handler) => {
      if (event === "sync_all_to_manager_store:progress") {
        progressHandler = handler as (event: { payload: unknown }) => void;
      }
      return unlisten;
    });

    let resolveSync: ((value: Skill[]) => void) | undefined;
    const syncPromise = new Promise<Skill[]>((resolve) => {
      resolveSync = resolve;
    });

    vi.mocked(invoke).mockImplementation((cmd, args) => {
      if (cmd === "bootstrap_skills_store") return Promise.resolve([] as unknown as never);
      if (cmd === "detect_startup_untracked_skills") return Promise.resolve([] as unknown as never);
      if (cmd === "sync_all_to_manager_store_with_progress") {
        expect(args).toEqual({
          agents: expect.arrayContaining([
            expect.objectContaining({ id: "amp", enabled: false }),
            expect.objectContaining({ id: "claude-code", enabled: true }),
            expect.objectContaining({ id: "codex", enabled: true }),
          ]),
          storagePath: "~/.skillsm",
        });
        return syncPromise as unknown as never;
      }
      return Promise.resolve(undefined as never);
    });

    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "同步全部" }));
    expect(await screen.findByText("资产汇总同步")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "请稍候..." })).toBeDisabled();

    progressHandler?.({
      payload: { id: "init", label: "正在初始化中心库索引...", status: "loading", progress: 0 },
    });
    progressHandler?.({
      payload: { id: "init", label: "正在初始化中心库索引...", status: "success", progress: 15 },
    });
    progressHandler?.({
      payload: {
        id: "merge",
        label: "正在进行资产去重与元数据合并...",
        status: "success",
        progress: 100,
      },
    });

    resolveSync?.([]);
    expect(
      await screen.findByRole("button", { name: "完成" }, { timeout: 4000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "完成" }));
    expect(screen.queryByText("资产汇总同步")).not.toBeInTheDocument();
    expect(unlisten).toHaveBeenCalled();
  });

  it("opens update-all modal and updates installed skills", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 0,
      }),
    );

    useSkillStore.getState().setSkills([
      {
        id: "skill-1",
        name: "Alpha Skill",
        sourceUrl: "github.com/foo/alpha",
        enabledAgents: ["codex" as never],
        installSource: "platform",
        isAdopted: true,
        lastSync: "2026-01-23T00:00:00Z",
        lastUpdate: "2026-01-23T00:00:00Z",
      },
    ]);

    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === "bootstrap_skills_store") {
        return Promise.resolve([
          {
            id: "skill-1",
            name: "Alpha Skill",
            sourceUrl: "github.com/foo/alpha",
            enabledAgents: ["codex"],
            installSource: "platform",
            isAdopted: true,
            lastSync: "2026-01-23T00:00:00Z",
            lastUpdate: "2026-01-23T00:00:00Z",
          },
        ] as unknown as never);
      }
      if (cmd === "detect_startup_untracked_skills") return Promise.resolve([] as unknown as never);
      if (cmd === "reinstall_skill") {
        return Promise.resolve({
          id: "skill-1",
          name: "Alpha Skill",
          sourceUrl: "github.com/foo/alpha",
          enabledAgents: ["codex"],
          lastSync: "2026-01-24T00:00:00Z",
          lastUpdate: "2026-01-24T00:00:00Z",
        } as unknown as never);
      }
      if (cmd === "sync_skill_distribution") return Promise.resolve(undefined as never);
      return Promise.resolve(undefined as never);
    });

    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "更新全库" }));
    expect(await screen.findByRole("heading", { name: "更新全库" })).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: "完成" }, { timeout: 4000 }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith("reinstall_skill", {
        skillId: "skill-1",
        skillName: "Alpha Skill",
        repoUrl: "github.com/foo/alpha",
        enabledAgents: ["codex"],
        storagePath: "~/.skillsm",
      });
    });

    await user.click(screen.getByRole("button", { name: "完成" }));
    expect(screen.queryByRole("heading", { name: "更新全库" })).not.toBeInTheDocument();
  });

  it("shows startup detect modal and syncs checked skills after confirm", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 1,
      }),
    );

    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });

    const syncedSkills: Skill[] = [{ id: "New Skill", name: "New Skill", enabledAgents: ["codex" as never] }];

    vi.mocked(invoke).mockImplementation((cmd, args) => {
      if (cmd === "bootstrap_skills_store") return Promise.resolve([] as unknown as never);
      if (cmd === "detect_startup_untracked_skills") {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([
              {
                id: "New Skill",
                name: "New Skill",
                sourceAgentIds: ["codex"],
                sourceAgentNames: ["Codex"],
              },
            ] as unknown as never);
          }, 0);
        }) as never;
      }
      if (cmd === "sync_selected_skills_to_manager_store") {
        expect(args).toEqual({
          agents: expect.arrayContaining([
            expect.objectContaining({ id: "codex", name: "Codex" }),
          ]),
          skillNames: ["New Skill"],
          storagePath: "~/.skillsm",
        });
        return Promise.resolve(syncedSkills as unknown as never);
      }
      return Promise.resolve(undefined as never);
    });

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    const user = userEvent.setup();

    await waitFor(() => {
      const detectCalls = vi
        .mocked(invoke)
        .mock.calls.filter(([cmd]) => cmd === "detect_startup_untracked_skills").length;
      expect(detectCalls).toBeGreaterThanOrEqual(2);
    });

    await waitFor(() => {
      const debugLogs = useSkillStore
        .getState()
        .logs.filter((log) => log.skillId === "启动检测调试");
      expect(debugLogs.length).toBeGreaterThanOrEqual(2);
      expect(debugLogs[0]?.message).toContain("启动检测结果");
    });

    expect(await screen.findByText("检测到新的 Skills")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /New Skill/ })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "同步到中心库" }));

    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith("sync_selected_skills_to_manager_store", {
        agents: expect.arrayContaining([
          expect.objectContaining({ id: "codex", name: "Codex" }),
        ]),
        skillNames: ["New Skill"],
        storagePath: "~/.skillsm",
      });
    });

    await waitFor(() => {
      expect(useSkillStore.getState().skills.map((s) => s.name)).toContain("New Skill");
    });

    const state = useSkillStore.getState();
    expect(state.skills.map((s) => s.name)).toEqual(["New Skill"]);
    expect(screen.queryByText("检测到新的 Skills")).not.toBeInTheDocument();
    expect(state.logs[0]).toMatchObject({ action: "sync", skillId: "启动检测", status: "success" });
  });

  it("still detects startup skills when claude entry is missing in persisted agents", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 1,
      }),
    );

    useAgentStore.setState({
      agents: [
        {
          id: "codex" as never,
          name: "Codex",
          defaultPath: "~/.codex/skills/.system/",
          currentPath: "~/.codex/skills/",
          enabled: true,
          icon: "codex",
        },
      ],
    });

    vi.mocked(invoke).mockImplementation((cmd, args) => {
      if (cmd === "bootstrap_skills_store") return Promise.resolve([] as unknown as never);
      if (cmd === "detect_startup_untracked_skills") {
        expect(args).toEqual(
          expect.objectContaining({
            agents: expect.arrayContaining([
              expect.objectContaining({ id: "codex", currentPath: "~/.codex/skills/" }),
              expect.objectContaining({ id: "claude-code", currentPath: "~/.claude/skills/" }),
            ]),
          }),
        );

        return Promise.resolve([
          {
            id: "Fresh Skill",
            name: "Fresh Skill",
            sourceAgentIds: ["claude-code"],
            sourceAgentNames: ["Claude Code"],
          },
        ] as unknown as never);
      }
      return Promise.resolve(undefined as never);
    });

    render(<App />);

    expect(await screen.findByText("检测到新的 Skills")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Fresh Skill/ })).toBeChecked();

    await waitFor(() => {
      const debugLogs = useSkillStore
        .getState()
        .logs.filter((log) => log.skillId === "启动检测调试");
      expect(debugLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("hydrates dashboard skills from configured manager storage on startup", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: {
          storagePath: "/Users/d0ublecl1ck/d0ublecl1ck_pkm/备份/skillsm",
          hasCompletedOnboarding: true,
        },
        version: 1,
      }),
    );

    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });
    useSettingsStore.setState({
      storagePath: "/Users/d0ublecl1ck/d0ublecl1ck_pkm/备份/skillsm",
      hasCompletedOnboarding: true,
      recycleBinRetentionDays: 15,
    });

    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === "bootstrap_skills_store") {
        return Promise.resolve([
          {
            id: "fastapi",
            name: "fastapi",
            enabledAgents: ["codex"],
            sourceUrl: undefined,
            lastSync: "2026-02-06T00:00:00Z",
            lastUpdate: "2026-02-06T00:00:00Z",
          },
        ] as unknown as never);
      }
      if (cmd === "detect_startup_untracked_skills") return Promise.resolve([] as unknown as never);
      return Promise.resolve(undefined as never);
    });

    render(<App />);

    expect(await screen.findByText("fastapi")).toBeInTheDocument();


    await waitFor(() => {
      expect(vi.mocked(invoke).mock.calls.some(([cmd, args]) => {
        if (cmd !== "bootstrap_skills_store") return false;
        const payload = args as { storagePath?: string; skills?: unknown[] };
        return payload.storagePath === "/Users/d0ublecl1ck/d0ublecl1ck_pkm/备份/skillsm" && Array.isArray(payload.skills);
      })).toBe(true);
    });

    await waitFor(() => {
      const debugLogs = useSkillStore
        .getState()
        .logs.filter((log) => log.skillId === "启动检测调试");

      expect(debugLogs.some((log) => log.message.includes("中心库加载完成"))).toBe(true);
    });
  });
});
