export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  return NextResponse.json({ user: data.user, session: data.session });
}
