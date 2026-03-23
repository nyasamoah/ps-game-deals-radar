# 🎮 PS Game Deals Radar v1.0.0

Track PlayStation Store prices, get deal alerts, compare regions, and save money on PS5 & PS4 games.

## Features

- **Real-time price tracking** — Scrapes PS Store prices every 6 hours across 7 regions
- **Smart alerts** — Set global or per-game thresholds (discount % or max price)
- **Price history** — Charts showing price trends over 3-36 months
- **Multi-region comparison** — Find the cheapest region for any game
- **PSN account linking** — Sync your PlayStation wishlist
- **PS Plus integration** — See which games are included in Essential/Extra/Premium
- **3-tier subscriptions** — Free, Pro ($3.99/mo), Ultimate ($7.99/mo)
- **Notifications** — Push, Email (Resend), and Telegram
- **Data export** — CSV/JSON export for Ultimate users

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + React + Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe Checkout + Webhooks |
| Email | Resend |
| Hosting | Vercel |
| Scraping | Node.js fetch + Cheerio |

## Quick Start

See **SETUP_GUIDE.md** for a complete, non-coder-friendly walkthrough.

## Project Structure

```
├── app/
│   ├── page.jsx              # Main app (all UI)
│   ├── layout.js             # Root layout + metadata
│   ├── globals.css            # Styles + animations
│   └── api/
│       ├── games/             # Browse & search games
│       ├── games/[id]/        # Game detail + price history
│       ├── wishlist/          # Wishlist CRUD
│       ├── owned/             # Owned games CRUD
│       ├── alerts/            # Alert rules CRUD
│       ├── profile/           # User preferences
│       ├── export/            # Data export (Ultimate)
│       ├── psn/link/          # PSN account linking
│       ├── auth/login/        # Login
│       ├── auth/signup/       # Signup
│       ├── stripe/checkout/   # Create Stripe session
│       ├── stripe/webhook/    # Handle Stripe events
│       ├── stripe/portal/     # Customer billing portal
│       └── cron/
│           ├── scrape-prices/ # Price scraper (every 6h)
│           └── send-notifications/ # Alert sender (every 6h)
├── lib/
│   ├── supabase.js            # Database client
│   ├── stripe.js              # Stripe config + plans
│   ├── scraper.js             # PS Store price scraper
│   └── notifications.js       # Email + Telegram sender
├── supabase/
│   └── schema.sql             # Database tables + RLS
├── public/
│   └── manifest.json          # PWA manifest
├── SETUP_GUIDE.md             # Step-by-step setup for non-coders
└── .env.example               # Environment variables template
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | Browse/search games |
| GET | `/api/games/[id]` | Game detail + history |
| GET/POST/DELETE | `/api/wishlist` | Manage wishlist |
| GET/POST/DELETE | `/api/owned` | Manage owned games |
| GET/POST/DELETE | `/api/alerts` | Manage alert rules |
| GET/PATCH | `/api/profile` | User preferences |
| POST | `/api/stripe/checkout` | Create payment session |
| POST | `/api/stripe/portal` | Billing management |
| POST | `/api/stripe/webhook` | Stripe event handler |
| POST/DELETE | `/api/psn/link` | Link/unlink PSN |
| GET | `/api/export` | Export user data |
| GET | `/api/cron/scrape-prices` | Run price scraper |
| GET | `/api/cron/send-notifications` | Send alerts |

## License

MIT
