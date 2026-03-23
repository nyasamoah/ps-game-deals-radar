export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { scrapeAllRegions } from "@/lib/scraper";

export const maxDuration = 300; // 5 minutes

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scrapeAllRegions(["US", "GB", "EU", "JP", "AU", "CA", "BR"]);
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
