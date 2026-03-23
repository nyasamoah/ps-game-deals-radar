# PS Game Deals Radar v1.0.0 — Complete Setup Guide

> **This guide is written for someone who does NOT code.** Follow each step exactly. If you get stuck, copy the error message and ask Claude for help.

---

## What You're Building

A web app that:
- Scrapes real PlayStation Store prices daily
- Sends notifications (email, push, Telegram) when games hit your price targets
- Lets users subscribe and pay (Free / Pro / Ultimate) via Stripe
- Links PSN accounts to sync wishlists
- Compares prices across 7 regions
- Shows price history charts

---

## What You'll Need (All Free to Start)

| Service | What It Does | Cost |
|---------|-------------|------|
| [Vercel](https://vercel.com) | Hosts your website | Free |
| [Supabase](https://supabase.com) | Database + user accounts | Free (up to 50,000 users) |
| [Stripe](https://stripe.com) | Processes payments | Free until you earn money (2.9% + 30¢ per transaction) |
| [Resend](https://resend.com) | Sends notification emails | Free (100 emails/day) |
| [GitHub](https://github.com) | Stores your code | Free |

---

## STEP 1: Create Your Accounts (15 minutes)

### 1a. GitHub
1. Go to https://github.com/signup
2. Create an account
3. Click the **+** in the top right → **New repository**
4. Name it `ps-game-deals-radar`
5. Check "Add a README file"
6. Click **Create repository**

### 1b. Vercel
1. Go to https://vercel.com/signup
2. Sign up with your GitHub account
3. That's it for now

### 1c. Supabase
1. Go to https://supabase.com
2. Sign up with your GitHub account
3. Click **New project**
4. Name: `ps-game-deals-radar`
5. Set a strong **database password** — SAVE THIS SOMEWHERE SAFE
6. Region: Choose the closest to you (e.g., West US)
7. Click **Create new project** and wait ~2 minutes

### 1d. Stripe
1. Go to https://stripe.com
2. Create an account
3. You'll start in **Test Mode** (good — we'll go live later)
4. Go to **Developers** → **API keys**
5. Copy your **Publishable key** (starts with `pk_test_`)
6. Copy your **Secret key** (starts with `sk_test_`)
7. Save both somewhere safe

### 1e. Resend
1. Go to https://resend.com
2. Create an account
3. Go to **API Keys** → **Create API Key**
4. Copy and save the key

---

## STEP 2: Set Up Your Database (10 minutes)

1. In Supabase, go to your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the ENTIRE contents of the file `supabase/schema.sql` (from this project)
5. Paste it into the SQL editor
6. Click **Run**
7. You should see "Success" — your database tables are now created

---

## STEP 3: Create Stripe Products (10 minutes)

1. In Stripe dashboard, go to **Products**
2. Click **+ Add product**

### Create "Pro" plan:
- Name: `PS Game Deals Radar Pro`
- Click **Add price**: $3.99/month (recurring, monthly)
- Click **Add another price**: $29.99/year (recurring, yearly)
- Save. Copy the **price IDs** (start with `price_`)

### Create "Ultimate" plan:
- Name: `PS Game Deals Radar Ultimate`
- Click **Add price**: $7.99/month (recurring, monthly)
- Click **Add another price**: $59.99/year (recurring, yearly)
- Click **Add another price**: $99.99 one-time
- Save. Copy the **price IDs**

### Set up Stripe Webhook:
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://YOUR-APP-URL.vercel.app/api/stripe/webhook` (update after deploying)
4. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Webhook signing secret** (starts with `whsec_`)

---

## STEP 4: Upload the Code to GitHub (10 minutes)

### Option A: Using GitHub Website (Easier)
1. Go to your `ps-game-deals-radar` repository on GitHub
2. Click **Add file** → **Upload files**
3. Drag ALL the project files/folders from this download into the upload area
4. Click **Commit changes**

### Option B: Using GitHub Desktop (Better)
1. Download [GitHub Desktop](https://desktop.github.com)
2. Sign in with your GitHub account
3. Clone your `ps-game-deals-radar` repository
4. Copy all project files into the cloned folder
5. In GitHub Desktop, add a commit message like "Initial upload"
6. Click **Commit to main** then **Push origin**

---

## STEP 5: Deploy to Vercel (5 minutes)

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Find and select your `ps-game-deals-radar` repository
4. Under **Environment Variables**, add each variable from `.env.example`:

| Variable | Where To Find It |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys → Publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → Signing secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | The price ID from Step 3 |
| `STRIPE_PRO_YEARLY_PRICE_ID` | The price ID from Step 3 |
| `STRIPE_ULTIMATE_MONTHLY_PRICE_ID` | The price ID from Step 3 |
| `STRIPE_ULTIMATE_YEARLY_PRICE_ID` | The price ID from Step 3 |
| `STRIPE_ULTIMATE_LIFETIME_PRICE_ID` | The price ID from Step 3 |
| `RESEND_API_KEY` | Resend → API Keys |
| `CRON_SECRET` | Make up a random string (e.g., `mySecretCron123xyz`) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (add after first deploy) |

5. Click **Deploy**
6. Wait 2-3 minutes. Vercel will give you a URL like `ps-game-deals-radar.vercel.app`
7. Go back and update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
8. Update your Stripe webhook URL (Step 3) with your actual Vercel URL

---

## STEP 6: Set Up the Price Scraper (5 minutes)

The scraper runs automatically every 6 hours via Vercel Cron Jobs.

1. The file `vercel.json` in your project already configures this
2. After deploying, the scraper will start running automatically
3. To trigger it manually, visit: `https://YOUR-URL.vercel.app/api/cron/scrape-prices`

---

## STEP 7: Set Up Telegram Bot (Optional, 10 minutes)

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Name: `PS Game Deals Radar`
4. Username: `PSGameDealsRadarBot` (must be unique)
5. BotFather will give you a **token** — copy it
6. Go to Vercel → Settings → Environment Variables
7. Add `TELEGRAM_BOT_TOKEN` = your token
8. Redeploy

---

## STEP 8: Go Live with Stripe (When Ready)

1. In Stripe, click **Activate your account** (top banner)
2. Fill in your business details
3. Once approved, switch from Test Mode to Live Mode
4. Update your environment variables in Vercel with the **live** keys
5. Redeploy

---

## How It All Works

```
User visits your site
        ↓
Signs up (Supabase Auth)
        ↓
Links PSN account (optional)
        ↓
Browses games with real prices (scraped every 6 hours)
        ↓
Adds games to wishlist, sets alerts
        ↓
Subscribes to Pro/Ultimate (Stripe Checkout)
        ↓
Gets notified when deals match (Email/Push/Telegram)
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Module not found" error | Make sure all files are uploaded. Redeploy. |
| Stripe payments don't work | Check that all price IDs are correct in env vars |
| No games showing | Wait for the scraper to run (every 6 hours) or trigger manually |
| Emails not sending | Check Resend API key. Verify your domain in Resend dashboard. |
| Database errors | Re-run the schema.sql in Supabase SQL Editor |

---

## Monthly Costs Estimate

| Users | Hosting | Database | Email | Total |
|-------|---------|----------|-------|-------|
| 0-1,000 | Free | Free | Free | **$0/month** |
| 1,000-10,000 | Free | $25/mo | $20/mo | **~$45/month** |
| 10,000+ | $20/mo | $25/mo | $20/mo | **~$65/month** |

Revenue from subscriptions will far exceed these costs.

---

## Need Help?

Come back to Claude with your error message and I'll help you fix it. Just paste:
1. The error message
2. Which step you're on
3. What you clicked/did before the error
