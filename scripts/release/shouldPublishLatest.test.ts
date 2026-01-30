import { describe, expect, it } from "vitest";
import { shouldPublishLatest } from "./shouldPublishLatest";

describe("shouldPublishLatest", () => {
  it("returns true when PR has release label (case-insensitive)", () => {
    expect(
      shouldPublishLatest({
        commitMessage: "chore: merge",
        prLabels: ["ReLeAsE"],
        releaseLabel: "release",
      }),
    ).toBe(true);
  });

  it("returns true when commit message contains [release]", () => {
    expect(
      shouldPublishLatest({
        commitMessage: "feat: ship it [release]",
        prLabels: [],
        releaseLabel: "release",
      }),
    ).toBe(true);
  });

  it("returns true when commit message contains release: ...", () => {
    expect(
      shouldPublishLatest({
        commitMessage: "release: latest",
        prLabels: [],
        releaseLabel: "release",
      }),
    ).toBe(true);
  });

  it("returns false when no signal is present", () => {
    expect(
      shouldPublishLatest({
        commitMessage: "chore: merge",
        prLabels: ["docs"],
        releaseLabel: "release",
      }),
    ).toBe(false);
  });
});

