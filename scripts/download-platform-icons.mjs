import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "platform-icons");

const ICONS = [
  {
    url: "https://ampcode.com/amp-mark-color.svg",
    filename: "amp.svg",
  },
  {
    url: "https://ampcode.com/client-icons/antigravity.png",
    filename: "antigravity.png",
  },
  {
    url: "https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/openai.svg",
    filename: "codex.svg",
  },
  {
    url: "https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/cursor.svg",
    filename: "cursor.svg",
  },
  {
    url: "https://opencode.ai/favicon-96x96-v3.png",
    filename: "opencode.png",
  },
];

async function download({ url, filename }) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  const outPath = path.join(OUTPUT_DIR, filename);
  await writeFile(outPath, data);
  return outPath;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const icon of ICONS) {
    console.log(`Downloading ${icon.url} -> ${path.join("public", "platform-icons", icon.filename)}`);
    results.push(await download(icon));
  }

  console.log(`Done. Downloaded ${results.length} files to ${path.relative(PROJECT_ROOT, OUTPUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
