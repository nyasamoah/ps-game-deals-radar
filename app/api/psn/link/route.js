import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// PSN API endpoints (community-maintained)
// In production, use the `psn-api` npm package for full functionality
const PSN_AUTH_URL = "https://ca.account.sony.com/api/authz/v3/oauth";

export async function POST(request) {
  try {
    const { userId, psnUsername } = await request.json();

    if (!userId || !psnUsername) {
      return NextResponse.json({ error: "Missing userId or psnUsername" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Store the PSN username
    const { error } = await supabase
      .from("profiles")
      .update({
        psn_username: psnUsername,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    // In production, you would:
    // 1. Use psn-api npm package to authenticate with PSN
    // 2. Fetch user's trophy list and game library
    // 3. Fetch their wishlist
    // 4. Auto-add wishlisted games to our wishlists table
    // 5. Auto-mark owned games

    // For now, we just link the username
    // To implement full PSN sync, install `psn-api` and add OAuth flow

    return NextResponse.json({
      success: true,
      message: `PSN account "${psnUsername}" linked successfully`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Unlink PSN
export async function DELETE(request) {
  try {
    const { userId } = await request.json();
    const supabase = createServerSupabaseClient();

    await supabase
      .from("profiles")
      .update({ psn_username: null })
      .eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
