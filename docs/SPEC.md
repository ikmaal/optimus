# Car booking — product rules (v1)

## Scope

- **Fleet**: Two company cars (configurable in DB). Both can be booked for the same time window by different people (different cars).
- **Purpose**: Work-related trips. Optional free-text **reason** on each booking for team visibility.

## Who can book

- Any user who can sign in with a **company email** (domain allowlist via `ALLOWED_EMAIL_DOMAIN` env, e.g. `@company.com`).  
- Admins are not required for v1; bookings are **self-serve** (no approval workflow).

## Booking window

- **Start** and **end** are **UTC** in the API; the UI shows times in the user’s **local** timezone.  
- **Overnight** and **weekend** bookings are allowed unless you change env `ALLOW_WEEKENDS=false` (optional future tightening).

## Overlap policy

- **Per car**: Two bookings for the same `carId` must not overlap in time.  
- Overlap is defined as: `booking1.start < booking2.end AND booking2.start < booking1.end`.  
- **Different cars** may overlap.

## Changes and cancellation

- Users may **cancel** their own bookings (soft delete: `cancelledAt` set).  
- **Editing** is implemented as cancel + create new to keep an audit-friendly history (optional: add explicit `updatedAt` later).

## Auth / Slack identity

- Session binds **app user** to `email` + `name`.  
- For Slack digests, set optional `slackUserId` on the user record when you map accounts (manual or future OAuth). Message text falls back to display name if Slack ID is missing.

## Notifications

- **Daily digest**: Posted to a Slack channel on a schedule (weekdays by default in your cron config). See `README.md` for wiring `CRON_SECRET` and Slack tokens.
