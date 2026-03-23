export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// Get user's wishlist
export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabase
    .from("wishlists")
    .select("game_id, added_at, games(*)")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wishlist: data || [] });
}

// Add to wishlist
export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const { userId, gameId } = await request.json();

  if (!userId || !gameId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Check plan limits
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const limits = { free: 5, pro: 50, ultimate: Infinity };
  const maxWishlist = limits[profile?.plan || "free"];

  const { count } = await supabase.from("wishlists").select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (count >= maxWishlist) {
    return NextResponse.json({ error: "Wishlist limit reached. Upgrade your plan!" }, { status: 403 });
  }

  const { error } = await supabase.from("wishlists").upsert({ user_id: userId, game_id: gameId }, { onConflict: "user_id,game_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Remove from wishlist
export async function DELETE(request) {
  const supabase = createServerSupabaseClient();
  const { userId, gameId } = await request.json();

  const { error } = await supabase.from("wishlists").delete().eq("user_id", userId).eq("game_id", gameId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
