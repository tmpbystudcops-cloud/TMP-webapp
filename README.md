# TMP at NU — Campus Snacks 🛒

A mobile-first campus snack-ordering web app. Students browse snacks, add to cart, pay via
UPI, and track their order. A password-protected admin panel manages products, orders (with
realtime updates), and shop settings.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase**.
The UI follows a Material-3 orange design system.

---

## Features

**Customer**
- Bento-style home with search, category filters, featured items, deals & "brain food"
- Cart (persists across navigation) with live stock validation
- UPI checkout: deep-link Quick Pay, QR code, Order ID + UPI ID copy, UTR entry, confirm modal
- Order tracking by Order ID + recent-orders history
- Profile with saved details (name/WhatsApp) and order history — **no login required**

**Admin** (`/admin`, password-gated)
- Dashboard: product count, pending orders, today's & total revenue, top spender
- Open/close shop toggle
- Products CRUD (name, price, deal price, stock, category, image, description, featured)
- Orders: **realtime** new-order alerts, status updates (Pending → Ready → Picked Up), sort, pagination
- Settings: shop name, UPI ID, tagline, Quick Pay toggle, change admin password

---

## Getting started

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → **New project**. Once it's ready, open
**Project Settings → API** and copy:
- Project URL
- `anon` `public` key
- `service_role` `secret` key

### 2. Configure environment
Copy `.env.local.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never exposed to the browser
# optional Telegram order alerts:
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 3. Apply the database schema
**Option A — Supabase SQL editor (easiest):** open the SQL editor in your project and run,
in order, the contents of:
- `supabase/migrations/0001_init.sql`  (tables, RLS, views, realtime)
- `supabase/migrations/0002_seed.sql`  (sample products + settings)
- `supabase/migrations/0003_place_order.sql`  (atomic order-placement function)

**Option B — Supabase CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The seed creates sample products and a settings row with a default admin password of
**`admin123`** (change it from the admin Settings tab, or in the SQL editor).

### 4. Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000. Admin panel: http://localhost:3000/admin.

---

## Architecture notes
- **No Supabase Edge Functions.** Privileged operations run as Next.js route handlers
  (`src/app/api/**`) using the `service_role` key server-side. Same security model, one deploy.
- **RLS**: public can only `SELECT`. All writes go through server routes. The admin password is
  never exposed to the browser (`settings_public` view + column revoke).
- **Currency**: INR (₹). Payments via UPI deep link + QR; UTR entered manually and verified by the admin.
- See `APP_DOCUMENTATION.md` for the original product spec and `design-reference/` for the source design.

## Deploy (Vercel)
Push to GitHub, import into Vercel, and set the same env vars in **Project Settings →
Environment Variables**. `SUPABASE_SERVICE_ROLE_KEY` must **not** be prefixed with `NEXT_PUBLIC_`.
