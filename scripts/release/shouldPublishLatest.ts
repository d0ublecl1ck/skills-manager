export type PublishLatestInput = {
  commitMessage: string;
  prLabels: string[];
  releaseLabel: string;
};

const DEFAULT_RELEASE_LABEL = "release";

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

export function shouldPublishLatest({
  commitMessage,
  prLabels,
  releaseLabel,
}: PublishLatestInput): boolean {
  const normalizedReleaseLabel = normalize(releaseLabel || DEFAULT_RELEASE_LABEL);

  const hasReleaseLabel = prLabels.some(
    (label) => normalize(label) === normalizedReleaseLabel,
  );
  if (hasReleaseLabel) return true;

  const message = commitMessage || "";
  if (/\[release\]/i.test(message)) return true;
  if (/(^|\s)release:\s*\S+/i.test(message)) return true;

  return false;
}

