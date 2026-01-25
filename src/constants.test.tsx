import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PLATFORM_ICONS } from "./constants";
import { AgentId } from "./types";

describe("PLATFORM_ICONS", () => {
  it("uses local asset paths for image-based platform icons", () => {
    const cases: Array<{ id: AgentId; expectedSrc: string }> = [
      { id: AgentId.AMP, expectedSrc: "/platform-icons/amp.svg" },
      { id: AgentId.ANTIGRAVITY, expectedSrc: "/platform-icons/antigravity.svg" },
      { id: AgentId.CLAUDE_CODE, expectedSrc: "/platform-icons/claude-code.svg" },
      { id: AgentId.CLAWDBOT, expectedSrc: "/platform-icons/clawdbot.svg" },
      { id: AgentId.CLINE, expectedSrc: "/platform-icons/cline.svg" },
      { id: AgentId.CODEX, expectedSrc: "/platform-icons/codex.svg" },
      { id: AgentId.COPILOT, expectedSrc: "/platform-icons/copilot.svg" },
      { id: AgentId.CURSOR, expectedSrc: "/platform-icons/cursor.svg" },
      { id: AgentId.DROID, expectedSrc: "/platform-icons/droid.svg" },
      { id: AgentId.GEMINI_CLI, expectedSrc: "/platform-icons/gemini-cli.svg" },
      { id: AgentId.GOOSE, expectedSrc: "/platform-icons/goose.svg" },
      { id: AgentId.KILO_CODE, expectedSrc: "/platform-icons/kilo-code.svg" },
      { id: AgentId.OPENCODE, expectedSrc: "/platform-icons/opencode.svg" },
      { id: AgentId.KIRO_CLI, expectedSrc: "/platform-icons/kiro-cli.svg" },
      { id: AgentId.QODER, expectedSrc: "/platform-icons/qoder.svg" },
      { id: AgentId.QWEN_CODE, expectedSrc: "/platform-icons/qwen-code.svg" },
      { id: AgentId.ROO_CODE, expectedSrc: "/platform-icons/roo-code.svg" },
      { id: AgentId.TRAE, expectedSrc: "/platform-icons/trae.svg" },
      { id: AgentId.WINDSURF, expectedSrc: "/platform-icons/windsurf.svg" },
    ];

    for (const { id, expectedSrc } of cases) {
      const Icon = PLATFORM_ICONS[id];
      const { container, unmount } = render(<Icon size={24} />);

      const img = container.querySelector("img");
      expect(img, `expected img for ${id}`).not.toBeNull();
      expect(img?.getAttribute("src")).toBe(expectedSrc);
      expect(img?.getAttribute("src")).not.toMatch(/^https?:\/\//);

      unmount();
    }
  });
});
