export type PathViolation = {
  line: number;
  column: number;
  path: string;
  user: string;
};

export type FileViolation = PathViolation & { file: string };

export type ScanFile = { file: string; content: string };

/**
 * Home-directory segments that belong to CI runners and container base images
 * rather than to a person. Keep this list short and explicit.
 */
export const ALLOWED_USER_SEGMENTS: readonly string[] = [
  "app",
  "builder",
  "circleci",
  "code",
  "debian",
  "linuxbrew",
  "node",
  "runner",
  "travis",
  "ubuntu",
  "user",
  "vscode",
];

const PATH_TAIL = /[^\s"'\`<>|,;()]/;

function extendToPathEnd(line: string, end: number): number {
  let cursor = end;
  while (cursor < line.length && PATH_TAIL.test(line[cursor])) {
    cursor += 1;
  }
  return cursor;
}

const UNIX_PATTERN = /\/(?:Users|home)\/([A-Za-z0-9._-]+)(?=[/\\]|$)/g;
const WINDOWS_PATTERN = /[A-Za-z]:\\Users\\([A-Za-z0-9._-]+)(?=[/\\]|$)/g;
const PATTERNS = [UNIX_PATTERN, WINDOWS_PATTERN];

export function findAbsolutePersonalPaths(
  text: string,
  options: { allowedUserSegments?: readonly string[] } = {},
): PathViolation[] {
  const allowed = new Set(
    (options.allowedUserSegments ?? ALLOWED_USER_SEGMENTS).map((segment) =>
      segment.toLowerCase(),
    ),
  );

  const violations: PathViolation[] = [];

  text.split(/\r?\n/).forEach((line, lineIndex) => {
    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0;
      let match = pattern.exec(line);
      while (match !== null) {
        const start = match.index;
        const end = extendToPathEnd(line, start + match[0].length);
        const user = match[1];

        if (!allowed.has(user.toLowerCase())) {
          violations.push({
            line: lineIndex + 1,
            column: start + 1,
            path: line.slice(start, end),
            user,
          });
        }

        pattern.lastIndex = end;
        match = pattern.exec(line);
      }
    }
  });

  return violations.sort((a, b) => a.line - b.line || a.column - b.column);
}

export function scanFiles(
  files: readonly ScanFile[],
  options?: { allowedUserSegments?: readonly string[] },
): FileViolation[] {
  const violations: FileViolation[] = [];

  for (const file of files) {
    for (const violation of findAbsolutePersonalPaths(file.content, options)) {
      violations.push({ ...violation, file: file.file });
    }
  }

  return violations;
}

export function formatViolations(violations: readonly FileViolation[]): string {
  return violations
    .map((violation) => `${violation.file}:${violation.line}:${violation.column}  ${violation.path}`)
    .join("\n");
}
