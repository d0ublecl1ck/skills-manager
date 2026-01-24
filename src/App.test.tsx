import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { Skill } from "./types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("App", () => {
  afterEach(() => {
    cleanup();
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
      if (cmd === "install_skill") return Promise.resolve(installedSkill as unknown as never);
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

    expect(vi.mocked(invoke)).toHaveBeenCalledWith("install_skill", {
      repoUrl: "github.com/foo/bar",
      storagePath: "~/.skillsm",
    });
    expect(screen.getByRole("button", { name: "正在安装..." })).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: "安装" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(repoInput).toHaveValue("");
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

  it("opens dev modal when clicking update all", async () => {
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
      return Promise.resolve(undefined as never);
    });

    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "更新全库" }));
    expect(await screen.findByText("正在开发中")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "我知道了" }));
    expect(screen.queryByText("正在开发中")).not.toBeInTheDocument();
  });
});
