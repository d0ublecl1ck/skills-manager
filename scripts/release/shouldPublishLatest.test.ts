import { describe, expect, it } from "vitest";
import { shouldPublishLatest } from "./shouldPublishLatest";

describe("shouldPublishLatest", () => {
  it("returns true when PR has release label (case-insensitive)", () => {
    expect(
      shouldPublishLatest({
        prLabels: ["ReLeAsE"],
        releaseLabel: "release",
      }),
    ).toBe(true);
  });

  it("returns false when no signal is present", () => {
    expect(
      shouldPublishLatest({
        prLabels: ["docs"],
        releaseLabel: "release",
      }),
    ).toBe(false);
  });
});
