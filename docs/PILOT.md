# Internal pilot (1–2 weeks)

Use this checklist before rolling the app out more widely.

## Before pilot

- [ ] Replace seed car labels/plates in the database with your real fleet names (or edit via Prisma Studio / SQL).
- [ ] Confirm booking rules in [docs/SPEC.md](SPEC.md) match what the team expects (weekends, overnight, open cancellation).
- [ ] Agree how you’ll handle **open access** (link sharing, VPN, etc.) — there is no login.

## During pilot

- [ ] Ask 3–5 people to create real bookings for actual trips (name, vehicle, reason).
- [ ] Watch for **double-booking attempts** (same car, overlapping times): the API should return a clear error; note any confusing UX.
- [ ] Collect feedback on **time zones** (times shown in browser local time vs expectations).
- [ ] Validate **Slack digest** content: correct channel, names + reasons, weekday schedule.

## After pilot

- [ ] Decide on **approval workflow** (if any) vs staying fully open.
- [ ] Add or trim fields (e.g. destination, odometer) if the team needs them.
- [ ] If you eventually host externally, choose persistence (SQLite file backup or a hosted DB).
