import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { formatViolations, scanFiles } from "./absolutePaths";
import { listTrackedTextFiles } from "./trackedFiles";

describe("repository tracked files", () => {
  it("contain no personal absolute paths", () => {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();

    const files = listTrackedTextFiles(root);
    expect(files.length).toBeGreaterThan(10);

    const violations = scanFiles(files);
    expect(
      violations,
      "Personal absolute paths found:\n" + formatViolations(violations),
    ).toEqual([]);
  });
});
