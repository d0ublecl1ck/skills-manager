export type PublishLatestInput = {
  prLabels: string[];
  releaseLabel: string;
};

const DEFAULT_RELEASE_LABEL = "release";

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

export function shouldPublishLatest({
  prLabels,
  releaseLabel,
}: PublishLatestInput): boolean {
  const normalizedReleaseLabel = normalize(releaseLabel || DEFAULT_RELEASE_LABEL);

  const hasReleaseLabel = prLabels.some(
    (label) => normalize(label) === normalizedReleaseLabel,
  );
  if (hasReleaseLabel) return true;

  return false;
}
