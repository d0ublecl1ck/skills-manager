import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { ScanFile } from "./absolutePaths";

const MAX_FILE_BYTES = 1_000_000;

/** Tracked, non-binary files under the given repository root. */
export function listTrackedTextFiles(root: string): ScanFile[] {
  const listed = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  const files: ScanFile[] = [];

  for (const file of listed.split("\0")) {
    if (!file) continue;

    try {
      const absolute = join(root, file);
      if (statSync(absolute).size > MAX_FILE_BYTES) continue;

      const buffer = readFileSync(absolute);
      if (buffer.includes(0)) continue;

      files.push({ file, content: buffer.toString("utf8") });
    } catch {
      continue;
    }
  }

  return files;
}
