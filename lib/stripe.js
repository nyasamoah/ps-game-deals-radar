import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const PLANS = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  ultimate: {
    monthly: process.env.STRIPE_ULTIMATE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_ULTIMATE_YEARLY_PRICE_ID,
    lifetime: process.env.STRIPE_ULTIMATE_LIFETIME_PRICE_ID,
  },
};

export function getPriceId(plan, cycle) {
  return PLANS[plan]?.[cycle] || null;
}

export function getPlanFromPriceId(priceId) {
  for (const [plan, prices] of Object.entries(PLANS)) {
    for (const [cycle, id] of Object.entries(prices)) {
      if (id === priceId) return { plan, cycle };
    }
  }
  return { plan: "free", cycle: null };
}
