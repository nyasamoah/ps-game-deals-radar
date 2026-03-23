import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabase
    .from("owned_games")
    .select("game_id, added_at, games(*)")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ owned: data || [] });
}

export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const { userId, gameId } = await request.json();
  if (!userId || !gameId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { error } = await supabase
    .from("owned_games")
    .upsert({ user_id: userId, game_id: gameId }, { onConflict: "user_id,game_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const supabase = createServerSupabaseClient();
  const { userId, gameId } = await request.json();

  const { error } = await supabase
    .from("owned_games")
    .delete()
    .eq("user_id", userId)
    .eq("game_id", gameId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
