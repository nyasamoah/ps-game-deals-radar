import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// Get user's alert rules
export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabase
    .from("alert_rules")
    .select("*, games(title, image_url)")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data || [] });
}

// Create or update alert rule
export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const { userId, gameId, alertType, minDiscount, maxPrice, isEnabled } = await request.json();

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Check if per-game alerts require Pro plan
  if (gameId) {
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
    if (profile?.plan === "free") {
      return NextResponse.json({ error: "Per-game alerts require Pro plan" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("alert_rules")
    .upsert({
      user_id: userId,
      game_id: gameId || null,
      alert_type: alertType || "both",
      min_discount: minDiscount || 50,
      max_price: maxPrice || 30,
      is_enabled: isEnabled !== undefined ? isEnabled : true,
    }, { onConflict: "user_id,game_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Delete alert rule
export async function DELETE(request) {
  const supabase = createServerSupabaseClient();
  const { userId, alertId } = await request.json();

  const { error } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", alertId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
