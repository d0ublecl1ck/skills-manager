import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { Skill } from "./types";
import { useSkillStore } from "./stores/useSkillStore";

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
      if (cmd === "bootstrap_skills_store") return Promise.resolve(undefined as never);
      if (cmd === "sync_all_to_manager_store") return Promise.resolve([] as unknown as never);
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
      if (cmd === "bootstrap_skills_store") return Promise.resolve(undefined as never);
      if (cmd === "sync_all_to_manager_store") return Promise.resolve([] as unknown as never);
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
      if (cmd === "bootstrap_skills_store") return Promise.resolve(undefined as never);
      if (cmd === "sync_all_to_manager_store") return Promise.resolve([] as unknown as never);
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

  it("auto-imports untracked skills on startup (adds only missing)", async () => {
    window.location.hash = "#/";
    window.localStorage.setItem(
      "settings-manager-storage-v1",
      JSON.stringify({
        state: { storagePath: "~/.skillsm", hasCompletedOnboarding: true },
        version: 1,
      }),
    );

    useSkillStore.setState({
      skills: [{ id: "existing", name: "Existing", enabledAgents: [] }],
      recycleBin: [
        { id: "deleted", name: "Deleted", enabledAgents: [], deletedAt: "2026-01-23T00:00:00Z" },
      ],
      logs: [],
    });

    const syncedSkills: Skill[] = [
      { id: "Existing", name: "Existing", enabledAgents: [] },
      { id: "Deleted", name: "Deleted", enabledAgents: [] },
      { id: "New Skill", name: "New Skill", enabledAgents: [] },
    ];

    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === "bootstrap_skills_store") return Promise.resolve(undefined as never);
      if (cmd === "sync_all_to_manager_store") return Promise.resolve(syncedSkills as unknown as never);
      return Promise.resolve(undefined as never);
    });

    render(<App />);

    await waitFor(() => {
      expect(useSkillStore.getState().skills.map((s) => s.name)).toContain("New Skill");
    });

    const state = useSkillStore.getState();
    expect(state.skills.map((s) => s.name).sort()).toEqual(["Existing", "New Skill"].sort());
    expect(state.recycleBin.map((s) => s.name)).toEqual(["Deleted"]);
    expect(state.logs[0]).toMatchObject({ action: "sync", skillId: "启动扫描", status: "success" });
  });
});
