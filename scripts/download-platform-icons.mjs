import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "platform-icons");

const ICONS = [
  {
    url: "https://ampcode.com/amp-mark-color.svg",
    filename: "amp.svg",
  },
  {
    // NOTE: this repo provides `public/platform-icons/antigravity.svg` directly.
    // Keep this entry so the script can validate the file exists.
    url: null,
    filename: "antigravity.svg",
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
    // NOTE: this repo provides `public/platform-icons/opencode.svg` directly.
    // Keep this entry so the script can validate the file exists.
    url: null,
    filename: "opencode.svg",
  },
];

async function download({ url, filename }) {
  if (!url) {
    const outPath = path.join(OUTPUT_DIR, filename);
    await access(outPath);
    console.log(`Using existing ${path.join("public", "platform-icons", filename)}`);
    return outPath;
  }

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
