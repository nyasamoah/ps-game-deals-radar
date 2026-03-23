export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { plan, cycle, userId } = session.metadata;

      await supabase.from("profiles").update({
        plan: plan || "pro",
        billing_cycle: cycle || "monthly",
        stripe_subscription_id: session.subscription || session.payment_intent,
        subscription_start: new Date().toISOString(),
      }).eq("id", userId);

      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const priceId = sub.items.data[0]?.price?.id;
      const { plan } = getPlanFromPriceId(priceId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", sub.customer)
        .single();

      if (profile) {
        await supabase.from("profiles").update({
          plan: sub.status === "active" ? plan : "free",
          stripe_subscription_id: sub.id,
        }).eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", sub.customer)
        .single();

      if (profile) {
        await supabase.from("profiles").update({
          plan: "free",
          stripe_subscription_id: null,
          billing_cycle: null,
        }).eq("id", profile.id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log("Payment failed for customer:", invoice.customer);
      // Optionally send a notification to the user
      break;
    }
  }

  return NextResponse.json({ received: true });
}
