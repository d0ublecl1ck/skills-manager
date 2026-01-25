import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PLATFORM_ICONS } from "./constants";
import { AgentId } from "./types";

describe("PLATFORM_ICONS", () => {
  it("uses local asset paths for image-based platform icons", () => {
    const cases: Array<{ id: AgentId; expectedSrc: string }> = [
      { id: AgentId.AMP, expectedSrc: "/platform-icons/amp.svg" },
      { id: AgentId.ANTIGRAVITY, expectedSrc: "/platform-icons/antigravity.svg" },
      { id: AgentId.CODEX, expectedSrc: "/platform-icons/codex.svg" },
      { id: AgentId.CURSOR, expectedSrc: "/platform-icons/cursor.svg" },
      { id: AgentId.OPENCODE, expectedSrc: "/platform-icons/opencode.svg" },
      { id: AgentId.KIRO_CLI, expectedSrc: "/platform-icons/generic.svg" },
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
