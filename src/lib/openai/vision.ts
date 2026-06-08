/**
 * GPT-4o vision extraction for vehicle check-in readings.
 *
 * Two driver photos:
 * 1. Dashboard — digital odometer + analog fuel needle in one shot.
 * 2. Cashcard / ERP screen — balance, date, and time.
 *
 * Bundled reference images (public/reference/inspection/) are sent first so the
 * model learns the exact layout of this fleet's instruments.
 */

import { referenceImageDataUrl } from "@/lib/inspection/references";

const RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const MODEL = "gpt-4o";

export type VehicleReadings = {
  odometerKm: number | null;
  fuelFraction: number | null;
  /** Cashcard balance in dollars (e.g. 74.21). */
  cashcardBalance: number | null;
  /** ISO 8601 datetime parsed from the cashcard screen, or null. */
  cashcardCapturedAt: string | null;
  confidence: "high" | "medium" | "low" | string | null;
  notes: string | null;
  raw: unknown;
};

export type ExtractVehicleReadingsOptions = {
  fuelGaugeHint?: string;
};

function buildPrompt(options?: ExtractVehicleReadingsOptions): string {
  const lines = [
    "You are reading two photos from a company car check-in.",
    "Reference images (sent first) show the EXACT instrument layouts for this fleet — use them to locate fields, then read values ONLY from the driver's photos.",
    "",
    "Return ONLY a JSON object, no prose:",
    '{ "odometerKm": number|null, "fuelFraction": number|null, "cashcardBalance": number|null, "cashcardCapturedAt": string|null, "confidence": "high"|"medium"|"low", "notes": string }',
    "",
    "PHOTO 1 — DASHBOARD (odometer + fuel in the same image):",
    "",
    "Odometer:",
    "- Read the TOTAL odometer from the central digital LCD display.",
    "- It appears as XXXXXXkm at the bottom of the centre screen (e.g. 234304km).",
    "- Strip the 'km' suffix; return the number only.",
    "- Ignore trip meters, range-to-empty (e.g. 223km), and speed readouts.",
    "",
    "Fuel (analog needle):",
    "- Small semi-circular sub-gauge at the bottom of the RIGHT speedometer.",
    "- Scale: 0 (empty, left) → 1 (full, right) with a fuel-pump icon in the centre.",
    "- Read the SHORT red fuel needle along the 0→1 arc — NOT the large speedometer needle.",
    "- Needle near 1 / last tick before 1 → about 0.85–0.95.",
    "- Do NOT confuse with the temperature gauge on the left tachometer.",
    "",
    "PHOTO 2 — CASHCARD / ERP SCREEN:",
    "",
    "- cashcardBalance: dollar amount top-left next to the CEPAS logo (e.g. $74.21 → 74.21). No currency symbol.",
    "- cashcardCapturedAt: combine the date and time on screen into ISO 8601 (e.g. 'Thu, 04/06/2026' + '9:58 AM' → '2026-06-04T09:58:00').",
    "  Assume DD/MM/YYYY for ambiguous dates unless clearly US format.",
    "- Null any field that is unreadable.",
    "",
    "General:",
    "- confidence reflects certainty across all four readings.",
    "- notes: one short sentence on needle position or any ambiguity.",
  ];

  if (options?.fuelGaugeHint) {
    lines.push("", "CAR-SPECIFIC HINT:", options.fuelGaugeHint);
  }

  return lines.join("\n");
}

type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

function buildContent(
  dashboardDataUrl: string,
  cashcardDataUrl: string,
  options?: ExtractVehicleReadingsOptions,
): ContentPart[] {
  const parts: ContentPart[] = [{ type: "input_text", text: buildPrompt(options) }];

  const dashRef = referenceImageDataUrl("dashboard");
  const cardRef = referenceImageDataUrl("cashcard");

  if (dashRef) {
    parts.push({
      type: "input_text",
      text: "REFERENCE — dashboard layout (locate fields here; do NOT copy these values):",
    });
    parts.push({ type: "input_image", image_url: dashRef });
  }
  if (cardRef) {
    parts.push({
      type: "input_text",
      text: "REFERENCE — cashcard / ERP screen layout:",
    });
    parts.push({ type: "input_image", image_url: cardRef });
  }

  parts.push(
    { type: "input_text", text: "DRIVER PHOTO 1 — read odometer and fuel from this dashboard image:" },
    { type: "input_image", image_url: dashboardDataUrl },
    { type: "input_text", text: "DRIVER PHOTO 2 — read cashcard balance, date, and time:" },
    { type: "input_image", image_url: cashcardDataUrl },
  );

  return parts;
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model output");
  return JSON.parse(match[0]);
}

function clampFraction(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Send dashboard + cashcard photos to GPT-4o and parse all check-in readings.
 */
export async function extractVehicleReadings(
  dashboardDataUrl: string,
  cashcardDataUrl: string,
  options?: ExtractVehicleReadingsOptions,
): Promise<VehicleReadings> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch(RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        {
          role: "user",
          content: buildContent(dashboardDataUrl, cashcardDataUrl, options),
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const payload = (await res.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  const text =
    payload.output_text ??
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("\n") ??
    "";

  if (!text.trim()) throw new Error("OpenAI returned an empty response");

  const parsed = extractJson(text) as Record<string, unknown>;

  return {
    odometerKm: toNumberOrNull(parsed.odometerKm),
    fuelFraction: clampFraction(parsed.fuelFraction),
    cashcardBalance: toNumberOrNull(parsed.cashcardBalance),
    cashcardCapturedAt: toIsoOrNull(parsed.cashcardCapturedAt),
    confidence: typeof parsed.confidence === "string" ? parsed.confidence : null,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
    raw: parsed,
  };
}
