import { describe, expect, it } from "vitest";
import tauriConfig from "../src-tauri/tauri.conf.json";

describe("tauri.conf.json", () => {
  it("sets initial window size to 1200x800", async () => {
    const config = tauriConfig as {
      app?: { windows?: Array<{ width?: number; height?: number }> };
    };

    expect(config.app?.windows?.[0]?.width).toBe(1200);
    expect(config.app?.windows?.[0]?.height).toBe(800);
  });
});
