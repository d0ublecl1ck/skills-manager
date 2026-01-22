import { invoke } from "@tauri-apps/api/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import App from "./App";
import type { Skill } from "./types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  it("renders dashboard and can install a skill via tauri invoke", async () => {
    const installedSkill: Skill = {
      id: "test-skill",
      name: "Test Skill",
      description: "A test skill installed via tauri.",
      author: "GitHub",
      source: "github",
      sourceUrl: "github.com/foo/bar",
      tags: ["local", "skills-manager"],
      enabledAgents: [],
      isAdopted: true,
      lastSync: "2026-01-23T00:00:00Z",
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
    });
    expect(screen.getByRole("button", { name: "正在安装..." })).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: "安装" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(repoInput).toHaveValue("");
  });
});
