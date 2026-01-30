import { execSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { shouldPublishLatest } from "./shouldPublishLatest";

type PullRequest = {
  number: number;
  labels?: Array<{ name?: string }>;
  merged_at?: string | null;
  merge_commit_sha?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function getCommitMessage(): string {
  try {
    return execSync(`git log -1 --pretty=%B ${process.env.GITHUB_SHA}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function writeOutput(name: string, value: string): void {
  const outputPath = getRequiredEnv("GITHUB_OUTPUT");
  appendFileSync(outputPath, `${name}=${value}\n`, { encoding: "utf8" });
}

async function listPullRequestsForCommit(params: {
  ownerRepo: string;
  sha: string;
  token: string;
}): Promise<PullRequest[]> {
  const url = `https://api.github.com/repos/${params.ownerRepo}/commits/${params.sha}/pulls`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${params.token}`,
      accept:
        "application/vnd.github+json, application/vnd.github.groot-preview+json",
      "x-github-api-version": "2022-11-28",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }

  const data = (await res.json()) as PullRequest[];
  return Array.isArray(data) ? data : [];
}

function pickBestPR(prs: PullRequest[], sha: string): PullRequest | undefined {
  const exactMergeCommit = prs.find((p) => p.merge_commit_sha === sha);
  if (exactMergeCommit) return exactMergeCommit;

  const merged = prs.find((p) => Boolean(p.merged_at));
  if (merged) return merged;

  return prs[0];
}

async function main(): Promise<void> {
  const ref = getRequiredEnv("GITHUB_REF");
  if (ref !== "refs/heads/master") {
    writeOutput("publish_latest", "false");
    return;
  }

  const ownerRepo = getRequiredEnv("GITHUB_REPOSITORY");
  const sha = getRequiredEnv("GITHUB_SHA");
  const token = getRequiredEnv("GITHUB_TOKEN");
  const releaseLabel = process.env.RELEASE_LABEL || "release";

  const commitMessage = getCommitMessage();

  let prLabels: string[] = [];
  try {
    const prs = await listPullRequestsForCommit({ ownerRepo, sha, token });
    const pr = pickBestPR(prs, sha);
    prLabels =
      pr?.labels
        ?.map((l) => l?.name)
        .filter((name): name is string => Boolean(name)) ?? [];
  } catch (err) {
    // If GitHub API is unavailable for some reason, fall back to commit message signal.
    prLabels = [];
    console.error(String(err));
  }

  const publishLatest = shouldPublishLatest({
    commitMessage,
    prLabels,
    releaseLabel,
  });

  writeOutput("publish_latest", publishLatest ? "true" : "false");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
