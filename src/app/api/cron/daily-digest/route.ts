import { NextResponse } from "next/server";
import { postDailyDigestToSlack } from "@/lib/slack/digest";

/**
 * Call from scheduler (e.g. GitHub Actions) with header:
 *   Authorization: Bearer <CRON_SECRET>
 * Optional query: date=YYYY-MM-DD (otherwise uses "today" in server timezone).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 501 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  let forDay: Date;
  if (dateParam) {
    forDay = new Date(`${dateParam}T12:00:00`);
    if (Number.isNaN(forDay.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
  } else {
    forDay = new Date();
  }

  const result = await postDailyDigestToSlack(forDay);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
