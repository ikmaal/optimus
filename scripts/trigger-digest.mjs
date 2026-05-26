/**
 * POST is not used — digest is GET with Bearer token.
 * Loads `.env` from project root and calls the cron route (local or deployed).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotenv() {
  const path = resolve(__dirname, "..", ".env");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

loadDotenv();

const base = (process.env.DIGEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("Missing CRON_SECRET. Set it in .env (see .env.example).");
  process.exit(1);
}

const url = `${base}/api/cron/daily-digest`;
let res;
try {
  res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`Request failed (${url}): ${msg}`);
  process.exit(1);
}
const body = await res.text();
console.log(`${res.status} ${res.statusText}`);
console.log(body);
process.exit(res.ok ? 0 : 1);
