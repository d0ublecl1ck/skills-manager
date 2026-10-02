import { describe, expect, it } from "vitest";

import { findAbsolutePersonalPaths } from "./absolutePaths";

// Paths are assembled at runtime on purpose: this test file is itself scanned by
// the guard, so a literal personal absolute path must never appear in the repo.
const macPath = (user: string) => ["", "Users", user, "project", "app.ts"].join("/");
const linuxPath = (user: string) => ["", "home", user, "project", "app.ts"].join("/");
const windowsPath = (user: string) => ["C:", "Users", user, "project", "app.ts"].join("\\");

describe("findAbsolutePersonalPaths", () => {
  it("flags a macOS personal path with its line and column", () => {
    const target = macPath("alice");
    const prefix = 'const p = "';
    const text = ["// heading", prefix + target + '";'].join("\n");

    expect(findAbsolutePersonalPaths(text)).toEqual([
      { line: 2, column: prefix.length + 1, path: target, user: "alice" },
    ]);
  });

  it("flags a Linux personal path", () => {
    const target = linuxPath("bob");

    expect(findAbsolutePersonalPaths("run: " + target)).toEqual([
      { line: 1, column: 6, path: target, user: "bob" },
    ]);
  });

  it("flags a Windows personal path", () => {
    const target = windowsPath("carol");

    expect(findAbsolutePersonalPaths(target)).toEqual([
      { line: 1, column: 1, path: target, user: "carol" },
    ]);
  });

  it("ignores service accounts used by CI and containers", () => {
    const samples = [
      ["", "home", "runner", "work", "repo", "file.ts"].join("/"),
      ["", "home", "linuxbrew", ".linuxbrew"].join("/"),
      ["", "home", "node", "app"].join("/"),
      ["", "Users", "runner", "work"].join("/"),
    ];

    expect(findAbsolutePersonalPaths(samples.join("\n"))).toEqual([]);
  });

  it("ignores portable paths", () => {
    const samples = [
      ["", "usr", "local", "bin"].join("/"),
      "~/.claude/skills/",
      "./relative/path",
      ["", "home"].join("/"),
    ];

    expect(findAbsolutePersonalPaths(samples.join("\n"))).toEqual([]);
  });

  it("reports every occurrence across lines, ordered by position", () => {
    const first = macPath("dave");
    const second = linuxPath("erin");
    const found = findAbsolutePersonalPaths([first, "clean", second].join("\n"));

    expect(found.map((violation) => [violation.line, violation.user])).toEqual([
      [1, "dave"],
      [3, "erin"],
    ]);
  });

  it("returns nothing for clean text", () => {
    expect(findAbsolutePersonalPaths("")).toEqual([]);
    expect(findAbsolutePersonalPaths("no paths here")).toEqual([]);
  });
});
