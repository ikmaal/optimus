import fs from "node:fs";
import path from "node:path";

const REF_DIR = path.join(process.cwd(), "public/reference/inspection");

const REF_FILES = {
  dashboard: "dashboard.png",
  cashcard: "cashcard.png",
} as const;

const cache = new Map<string, string>();

/** Load a bundled reference image as a base64 data URL for few-shot prompting. */
export function referenceImageDataUrl(kind: keyof typeof REF_FILES): string | null {
  const cached = cache.get(kind);
  if (cached) return cached;

  const filePath = path.join(REF_DIR, REF_FILES[kind]);
  if (!fs.existsSync(filePath)) return null;

  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  cache.set(kind, dataUrl);
  return dataUrl;
}
