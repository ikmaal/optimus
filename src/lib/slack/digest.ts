import { format } from "date-fns";
import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/prisma";

const DIGEST_TITLE = "Company Car Schedule";

function formatDigestShortDate(forDay: Date): string {
  return format(forDay, "EEE, d MMM yyyy");
}

/** Times as 16:00–18:00 (en dash, no spaces). */
function formatBookingTimeRange(start: Date, end: Date): string {
  const a = format(start, "HH:mm");
  const b = format(end, "HH:mm");
  return `${a}\u2013${b}`;
}

const MRKDWN_BLOCK_MAX = 2800;

/** Slack mrkdwn `section` blocks must stay under ~3000 characters. */
function chunkMrkdwnToSections(
  markdown: string,
): Array<{ type: "section"; text: { type: "mrkdwn"; text: string } }> {
  if (markdown.length <= MRKDWN_BLOCK_MAX) {
    return [{ type: "section", text: { type: "mrkdwn", text: markdown } }];
  }

  const out: Array<{ type: "section"; text: { type: "mrkdwn"; text: string } }> = [];
  let rest = markdown;
  while (rest.length > 0) {
    if (rest.length <= MRKDWN_BLOCK_MAX) {
      out.push({ type: "section", text: { type: "mrkdwn", text: rest } });
      break;
    }
    const slice = rest.slice(0, MRKDWN_BLOCK_MAX);
    const lastNl = slice.lastIndexOf("\n");
    const cut = lastNl > MRKDWN_BLOCK_MAX / 2 ? lastNl + 1 : MRKDWN_BLOCK_MAX;
    out.push({ type: "section", text: { type: "mrkdwn", text: rest.slice(0, cut).trimEnd() } });
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  return out;
}

function carEmoji(label: string): string {
  if (label === "Red Car") return "🔴";
  if (label === "Black Car") return "⚫";
  return "🚗";
}

type DigestData = {
  forDay: Date;
  cars: Awaited<ReturnType<typeof prisma.car.findMany>>;
  bookings: Awaited<ReturnType<typeof prisma.booking.findMany<{ include: { car: true } }>>>;
};

async function loadDigestData(forDay: Date): Promise<DigestData> {
  const dayStart = new Date(forDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(forDay);
  dayEnd.setHours(23, 59, 59, 999);

  const cars = await prisma.car.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });

  const bookings = await prisma.booking.findMany({
    where: {
      cancelledAt: null,
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    include: { car: true },
    orderBy: [{ carId: "asc" }, { startAt: "asc" }],
  });

  return { forDay, cars, bookings };
}

function groupBookingsByCarId(bookings: DigestData["bookings"]) {
  const byCar = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const list = byCar.get(b.carId) ?? [];
    list.push(b);
    byCar.set(b.carId, list);
  }
  return byCar;
}

function carHeadingLine(car: DigestData["cars"][number]): string {
  const plate = car.plate ? ` (${car.plate})` : "";
  return `${carEmoji(car.label)} ${car.label}${plate}`;
}

/** One line: 16:00–18:00 | name — reason */
function formatBookingLine(b: DigestData["bookings"][number]): string {
  const times = formatBookingTimeRange(b.startAt, b.endAt);
  const reason = b.reason?.trim();
  const tail = reason ? ` — ${reason}` : "";
  return `${times} | ${b.bookerName}${tail}`;
}

/** Car heading + booking rows; blank line between cars from caller. */
function formatCarSection(car: DigestData["cars"][number], list: DigestData["bookings"]): string {
  const head = carHeadingLine(car);
  if (list.length === 0) {
    return `${head}\nAvailable — no bookings`;
  }
  return `${head}\n${list.map(formatBookingLine).join("\n")}`;
}

/** Single string for Workflow Builder / compatible paths. */
function formatDigestMarkdown(data: DigestData): string {
  const { cars, bookings } = data;
  const dateLine = formatDigestShortDate(data.forDay);

  if (bookings.length === 0) {
    return `${dateLine}\n\nNo bookings scheduled for today.`;
  }

  const byCar = groupBookingsByCarId(bookings);
  const sections = cars.map((car) => formatCarSection(car, byCar.get(car.id) ?? []));
  return `${dateLine}\n\n${sections.join("\n\n")}`;
}

function buildNotificationFallback(data: DigestData): string {
  const { forDay, cars, bookings } = data;
  const day = formatDigestShortDate(forDay);
  if (bookings.length === 0) {
    return `${day}: ${DIGEST_TITLE} — no bookings.`;
  }
  const byCar = groupBookingsByCarId(bookings);
  const bits = cars.map((car) => {
    const list = byCar.get(car.id) ?? [];
    if (list.length === 0) return `${car.label}: free`;
    const names = list.map((b) => b.bookerName).join(", ");
    return `${car.label}: ${names}`;
  });
  return `${day}: ${bits.join(" · ")}`.slice(0, 500);
}

type SlackBlock =
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "divider" }
  | { type: "section"; text: { type: "mrkdwn"; text: string } };

function buildBlockKit(data: DigestData): SlackBlock[] {
  return chunkMrkdwnToSections(formatDigestMarkdown(data));
}

function isSlackWorkflowTriggerUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "hooks.slack.com" && u.pathname.includes("/triggers/");
  } catch {
    return url.includes("/triggers/");
  }
}

async function postViaIncomingWebhook(
  webhookUrl: string,
  workflowMarkdown: string,
  notificationText: string,
  blocks: SlackBlock[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const isWorkflow = isSlackWorkflowTriggerUrl(webhookUrl);
    const payload = isWorkflow
      ? (() => {
          const key = process.env.SLACK_WORKFLOW_MESSAGE_KEY?.trim() || "digest";
          return JSON.stringify({ [key]: workflowMarkdown });
        })()
      : JSON.stringify({
          text: notificationText,
          blocks,
        });

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Webhook HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    if (body === "invalid_payload") {
      return { ok: false, error: "Slack rejected payload (invalid_payload)" };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** Plain / workflow-friendly markdown (used for Workflow Builder variable). */
export async function buildDailyDigestMessage(forDay: Date): Promise<string> {
  const data = await loadDigestData(forDay);
  return formatDigestMarkdown(data);
}

/**
 * Posts the daily digest. Prefer **Incoming Webhook** (simplest); otherwise use Bot API.
 *
 * - Set `SLACK_WEBHOOK_URL` to `https://hooks.slack.com/services/...` (full message from app), or a Workflow
 *   trigger `https://hooks.slack.com/triggers/...` — then add a Text field in the webhook step (default key
 *   `digest`) and insert that variable in "Send a message"; override with `SLACK_WORKFLOW_MESSAGE_KEY` if needed.
 * - Or set `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID`
 */
export async function postDailyDigestToSlack(forDay: Date): Promise<{ ok: boolean; error?: string }> {
  const data = await loadDigestData(forDay);
  const workflowMarkdown = formatDigestMarkdown(data);
  const notificationText = buildNotificationFallback(data);
  const blocks = buildBlockKit(data);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    return postViaIncomingWebhook(webhookUrl, workflowMarkdown, notificationText, blocks);
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  if (token && channel) {
    const client = new WebClient(token);
    try {
      await client.chat.postMessage({
        channel,
        text: notificationText,
        blocks,
      });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }

  return {
    ok: false,
    error: "Configure Slack: set SLACK_WEBHOOK_URL, or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID",
  };
}
