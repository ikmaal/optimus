import { NextResponse } from "next/server";
import { inspectionConfig } from "@/lib/inspection/config";

/** Lets the UI know whether AI scanning is available and whether dev-skip is allowed. */
export async function GET() {
  return NextResponse.json(inspectionConfig());
}
