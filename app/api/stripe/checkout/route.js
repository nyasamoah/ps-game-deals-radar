import { NextResponse } from "next/server";
import { stripe, getPriceId } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { plan, cycle, userId } = await request.json();

    if (!plan || !cycle || !userId) {
      return NextResponse.json({ error: "Missing plan, cycle, or userId" }, { status: 400 });
    }

    const priceId = getPriceId(plan, cycle);
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or cycle" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .single();

    // Create or retrieve Stripe customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    // Create checkout session
    const isLifetime = cycle === "lifetime";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isLifetime ? "payment" : "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      metadata: { plan, cycle, userId },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
