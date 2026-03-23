import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const format = searchParams.get("format") || "json";

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Check Ultimate plan
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  if (profile?.plan !== "ultimate") {
    return NextResponse.json({ error: "Data export requires Ultimate plan" }, { status: 403 });
  }

  // Get all user data
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("games(title, ps_store_id)")
    .eq("user_id", userId);

  const { data: alerts } = await supabase
    .from("alert_rules")
    .select("*, games(title)")
    .eq("user_id", userId);

  const { data: owned } = await supabase
    .from("owned_games")
    .select("games(title, ps_store_id)")
    .eq("user_id", userId);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(100);

  const exportData = {
    exported_at: new Date().toISOString(),
    app: "PS Game Deals Radar v1.0.0",
    wishlist: wishlist?.map((w) => w.games) || [],
    alert_rules: alerts || [],
    owned_games: owned?.map((o) => o.games) || [],
    recent_notifications: notifications || [],
  };

  if (format === "csv") {
    // Convert wishlist to CSV
    const header = "Title,PS Store ID\n";
    const rows = exportData.wishlist.map((g) => `"${g.title}","${g.ps_store_id}"`).join("\n");
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="ps-deals-export.csv"',
      },
    });
  }

  return NextResponse.json(exportData);
}
