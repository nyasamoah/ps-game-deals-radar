export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// Get user profile
export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

// Update user profile/preferences
export async function PATCH(request) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { userId, ...updates } = body;

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Only allow updating these fields
  const allowed = [
    "notification_push", "notification_email", "notification_telegram",
    "telegram_chat_id", "default_region", "psn_username",
  ];
  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  }

  // Check plan limits for notification channels
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const plan = profile?.plan || "free";

  if (safeUpdates.notification_email && plan === "free") {
    return NextResponse.json({ error: "Email notifications require Pro plan" }, { status: 403 });
  }
  if (safeUpdates.notification_telegram && plan !== "ultimate") {
    return NextResponse.json({ error: "Telegram notifications require Ultimate plan" }, { status: 403 });
  }

  safeUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").update(safeUpdates).eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
