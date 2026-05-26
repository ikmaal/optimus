#!/usr/bin/env node
/** Render production start: resolve Postgres URL, migrate, then Next.js. */
import { execSync } from "node:child_process";

/**
 * Render may still have a manual SQLite DATABASE_URL — reject it and require Postgres.
 * Adds sslmode=require for Render-hosted Postgres when missing.
 */
function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? "";

  if (/^postgres(ql)?:\/\//i.test(raw)) {
    return withRenderSsl(raw);
  }

  console.error("[render-start] DATABASE_URL must be a PostgreSQL connection string.");
  if (raw.startsWith("file:")) {
    console.error("  Found SQLite URL (file:…). Remove it in Render → optimus → Environment.");
  } else if (raw) {
    console.error(`  Current value starts with: ${raw.slice(0, 24)}…`);
  } else {
    console.error("  DATABASE_URL is empty.");
  }
  console.error("");
  console.error("Fix in Render Dashboard:");
  console.error("  1. Environment → delete any manual DATABASE_URL (file: or old value).");
  console.error("  2. Add variable → Link database → optimus-db → Internal / Connection string.");
  console.error("     Name the variable exactly: DATABASE_URL");
  console.error("  3. Or sync the Blueprint (render.yaml) so DATABASE_URL comes from optimus-db.");
  console.error("");
  console.error("Expected format: postgresql://user:pass@host/db");
  process.exit(1);
}

function withRenderSsl(url) {
  if (/sslmode=/.test(url)) return url;
  // Render Postgres (internal or external hostnames)
  if (!/render\.com|dpg-[a-z0-9-]+\.[a-z]/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

const databaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

console.log("[render-start] Using PostgreSQL (host redacted)");
console.log("[render-start] Running Prisma migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
console.log("[render-start] Seeding fleet if empty…");
execSync("npx prisma db seed", { stdio: "inherit" });
console.log("[render-start] Starting Next.js…");
execSync("npm start", { stdio: "inherit" });
