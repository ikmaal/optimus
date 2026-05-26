# Optimus — company car booking

Internal web app to book two shared company cars, view a team calendar, and (optionally) post a **daily Slack digest** of who has each car.

Product rules live in [docs/SPEC.md](docs/SPEC.md). Pilot checklist: [docs/PILOT.md](docs/PILOT.md).

## Stack

- Next.js (App Router), TypeScript, Tailwind
- SQLite + Prisma (local single-file DB)
- Calendar: [FullCalendar](https://fullcalendar.io/) (React)

Access is **open** (no sign-in): bookings store **name**, **vehicle**, and **reason**.

The database file lives at **`prisma/dev.db`** when `DATABASE_URL` is `file:./dev.db` (see [.env.example](.env.example)).

## Project layout

- `src/app/` — App Router pages and `api/` handlers
- `src/components/` — client UI (dashboard, calendar)
- `src/lib/` — Prisma client, booking helpers, calendar theming, Slack digest under `lib/slack/`
- `src/types/` — shared types (e.g. fleet car shape for UI + API)
- `prisma/` — schema, migrations, local DB file (ignored by git), seed script
- `scripts/` — CLI helpers (digest trigger)

## Setup

1. Copy [.env.example](.env.example) to `.env`.
2. Install and migrate:

```bash
npm install
npx prisma migrate dev
```

3. Development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Drag on the calendar to book; event titles include the **reason** (truncated if long). To remove a booking, open it and confirm — the **driver name** must match.

If creating a booking fails, run **`npx prisma migrate deploy`**, then **`npx prisma generate`**, delete the **`.next`** folder, and restart the dev server (on Windows, stop the dev server before `generate` if you see an **EPERM** error on the Prisma engine file).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite URL, typically `file:./dev.db` (relative to `prisma/`) |
| `SLACK_WEBHOOK_URL` | **Recommended** — Incoming Webhook URL (`https://hooks.slack.com/services/...`) for the channel where you want the daily digest |
| `SLACK_BOT_TOKEN` | Optional — only if you use the bot instead of a webhook |
| `SLACK_CHANNEL_ID` | Required with bot token (e.g. `C...`) |
| `CRON_SECRET` | Long random string; must be sent as `Authorization: Bearer ...` to the cron route |

## Slack daily digest

### Option A — Incoming Webhook (easiest)

1. Open [Slack API: Your Apps](https://api.slack.com/apps), create or pick an app.
2. Turn on **Incoming Webhooks**, add a webhook to the **channel or group** where you want the daily message.
3. Copy the URL (starts with `https://hooks.slack.com/services/...`).
4. Set **`SLACK_WEBHOOK_URL`** in your deployment environment to that URL.
5. Set **`CRON_SECRET`** and schedule a daily call to **`GET /api/cron/daily-digest`** with header `Authorization: Bearer <CRON_SECRET>` (see GitHub Actions example in this repo).

Each run posts a single message listing **Red Car**, **Black Car**, who booked each window, and the **reason**.

### Option B — Bot token

1. Add bot scopes **`chat:write`** (and **`chat:write.public`** if needed), install to the workspace.
2. Set **`SLACK_BOT_TOKEN`** and **`SLACK_CHANNEL_ID`** (and leave **`SLACK_WEBHOOK_URL`** unset if you only use the bot).

**Endpoint:** `GET /api/cron/daily-digest`

**Auth:** header `Authorization: Bearer <CRON_SECRET>`

**Optional query:** `date=YYYY-MM-DD` to simulate a specific day (server timezone anchor).

The digest lists **driver name** and **reason** per slot.

### Example: GitHub Actions (weekdays)

See [.github/workflows/daily-digest.yml](.github/workflows/daily-digest.yml). Add repository secrets:

- `APP_BASE_URL` — public origin of the deployed app, no trailing slash (e.g. `https://cars.example.com`)
- `CRON_SECRET` — same value as in the app’s environment

Host the app wherever you deploy Node apps; provision SQLite on disk (or switch to Postgres later if you outgrow SQLite).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:seed` | Seed cars if table is empty |
