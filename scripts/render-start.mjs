#!/usr/bin/env node
/** Render production start: migrate Postgres schema, then Next.js. */
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("[render-start] DATABASE_URL is not set.");
  process.exit(1);
}

console.log("[render-start] Running Prisma migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
console.log("[render-start] Starting Next.js…");
execSync("npm start", { stdio: "inherit" });
