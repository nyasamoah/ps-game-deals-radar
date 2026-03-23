import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request, { params }) {
  const supabase = createServerSupabaseClient();
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "US";

  try {
    // Get game details
    const { data: game, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Get all region prices
    const { data: regionPrices } = await supabase
      .from("prices")
      .select("*")
      .eq("game_id", id);

    // Get price history
    const { data: priceHistory } = await supabase
      .from("price_history")
      .select("price, original_price, discount_percent, recorded_at")
      .eq("game_id", id)
      .eq("region", region)
      .order("recorded_at", { ascending: true });

    // Get price stats
    const { data: stats } = await supabase.rpc("get_price_stats", {
      p_game_id: parseInt(id),
      p_region: region,
    });

    return NextResponse.json({
      game,
      regionPrices: regionPrices || [],
      priceHistory: priceHistory || [],
      stats: stats || {},
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
