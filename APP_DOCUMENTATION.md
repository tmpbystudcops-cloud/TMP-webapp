# App Documentation - Complete Technical Specification

> **Purpose**: This document contains the full application specification. A developer with good experience and coding skills should be able to rebuild this app from scratch using only this document.

---

## 1. App Overvie
**Name**: TMP at NU (campus snack shop ordering system)

**Purpose**: A lightweight web application for a campus snack shop. Customers browse products, place orders via UPI payment, and track their order status. An admin panel manages products, orders, and shop settings.

**Architecture**: Single-Page Application (SPA) built with React + Vite + Supabase. No traditional authentication system. Admin access is protected by a password stored in the database. The app uses Supabase Edge Functions for privileged operations (order processing, admin mutations) and a Telegram notification system.

**Deployment**: Bolt.dev / Supabase hosting.

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18.3.1 (with JSX) |
| Build Tool | Vite 5.4.2 |
| Language | TypeScript 5.5.3 |
| Styling | Tailwind CSS 3.4.1 |
| Icons | lucide-react |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| API Client | @supabase/supabase-js 2.50.5 |
| Runtime for Edge Functions | Deno |
| Edge Function Runtime | Supabase Edge Functions (Deno) |
| Notifications | Telegram Bot API (via Edge Function) |
| QR Code Generation | External API (api.qrserver.com) |

---

## 3. Design Theme & Visual System

### Color Palette
- **Background**: `slate-950` (very dark slate) — used globally for all pages
- **Surface**: `slate-800` — cards, panels, tables
- **Elevated Surface**: `slate-700` — inner cards, input containers, hover states
- **Input Fields**: `slate-700` background with `slate-600` border
- **Accent / Primary**: `amber-400` to `amber-600` — buttons, headings, logo, primary actions
- **Secondary Accent**: `orange-500` to `orange-600` — gradients, hover states
- **Success**: `emerald-500` / `emerald-600` — success toasts, "Picked Up" status, "Shop Open" state
- **Warning**: `yellow-500` — "Pending" status, warning banner
- **Info / Cyan**: `cyan-500` / `cyan-600` — stats, refresh button, "Ready" status badge
- **Danger / Error**: `red-500` / `red-600` — error toasts, delete actions, "Shop Closed" state
- **Text Primary**: `white`
- **Text Secondary**: `slate-300`
- **Text Tertiary**: `slate-400`
- **Text Muted**: `slate-500`
- **Payment CTA**: `emerald-600` to `cyan-600` gradient for UPI Pay button
- **Link/WhApp**: `blue-400` for WhatsApp links

### Typography
- Font: System sans-serif (Tailwind default)
- Hero heading: `text-4xl` to `text-6xl`, `font-bold`, gradient text
- Section headings: `text-2xl` to `text-3xl`, `font-bold`
- Card titles: `text-lg`, `font-semibold`
- Body text: `text-sm` to `text-base`
- Monospace text: `font-mono` for order IDs, UPI IDs, transaction IDs
- Accent colors: `text-amber-400` for prices, `text-yellow-400` for order IDs

### Layout System
- Max-width: `max-w-7xl` for admin pages, `max-w-2xl` for customer pages, `max-w-md` for order form
- Container: `mx-auto px-4` (mobile-first padding)
- Cards: `rounded-lg` or `rounded-xl`, `p-4` to `p-6`
- Inputs: `p-3 bg-slate-700 rounded-lg border border-slate-600`
- Buttons: `rounded-lg px-4 py-2` or `rounded-lg px-6 py-3`, hover transitions
- Buttons with gradient: `bg-gradient-to-r from-amber-600 to-orange-600`
- Tables: `w-full` with `bg-slate-700` header, `divide-y divide-slate-700`
- Modals: `fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4`
- Toasts: `fixed top-4 right-4 z-50 space-y-2`, colored by type
- Spacing: 8px-based system (use `gap-4`, `mb-6`, `p-6` consistently)

### Animation & Micro-interactions
- Loading spinner: `animate-spin` with `border-t-amber-500`
- Skeleton loaders: `animate-pulse` on `bg-slate-700` blocks
- Button hover: `hover:scale-105` for hero button, `hover:brightness-95` for others
- Toast enter/exit: `transition-all duration-300`
- Card hover: `hover:scale-105` on select buttons
- Scroll behavior: Sticky navigation bar with `top-0 z-40`

---

## 4. Database Schema

### 4.1 Products Table
```
products
- id          bigserial PRIMARY KEY
- name        text NOT NULL
- price       numeric(10,2) NOT NULL CHECK (price > 0)
- stock       integer NOT NULL DEFAULT 0 CHECK (stock >= 0)
- available   boolean NOT NULL DEFAULT true
- created_at  timestamptz DEFAULT now()
```

**RLS Policies (after security hardening)**:
- `Public can read all products` — FOR SELECT TO public USING (true)
- All write operations (INSERT, UPDATE, DELETE) go through the `admin-action` edge function using service_role key

### 4.2 Orders Table
```
orders
- id              bigserial PRIMARY KEY
- name            text NOT NULL
- whatsapp        text NOT NULL
- items           jsonb NOT NULL
  Format: Array of { product_id, product_name, quantity, price }
- total           numeric(10,2) NOT NULL CHECK (total > 0)
- transaction_id  text NOT NULL
- status          text NOT NULL DEFAULT 'Pending'
  Valid values: 'Pending', 'Ready', 'Picked Up'
- unique_order_id text NOT NULL UNIQUE
- created_at      timestamptz DEFAULT now()
```

**RLS Policies (after security hardening)**:
- `Public can read all orders` — FOR SELECT TO public USING (true)
- All INSERT operations go through the `process-order` edge function using service_role key
- All UPDATE operations go through the `admin-action` edge function using service_role key

### 4.3 Settings Table
```
settings
- id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
- shop_name         text DEFAULT 'Shop'
- upi_id            text NOT NULL DEFAULT 'UPI ID'
- qr_code_url       text (nullable)
- tagline           text DEFAULT 'tagline'
- enable_quick_pay  boolean NOT NULL DEFAULT true
- admin_password    text (nullable)
- orders_enabled    boolean NOT NULL DEFAULT true
- created_at        timestamptz DEFAULT now()
- updated_at        timestamptz DEFAULT now()
```

**RLS Policies (after security hardening)**:
- `Public can read settings` — FOR SELECT TO public USING (true)
- All write operations go through the `admin-action` edge function using service_role key

**Trigger**: `update_settings_updated_at` — auto-updates `updated_at` on every update

### 4.4 Top Spender View
```
top_spender (view)
- whatsapp  text
- name      text (most recent name for that whatsapp number)
- total     numeric (sum of all orders for that whatsapp number)
```
Returns a single row: the customer with the highest cumulative spend across all orders. Used by the admin dashboard's "Top Spender" stat card so the calculation happens in SQL rather than in JavaScript on every fetch.

---

## 5. Application Pages

### 5.1 Home Page (Customer-Facing)

**Route**: `/` (default page)

**Layout**:
- Full-screen hero section with centered content
- Background: `min-h-screen bg-slate-950`
- Shop name displayed as `text-4xl` to `text-6xl` with gradient text (amber to orange)
- Tagline below: `text-xl` to `text-2xl text-slate-300`
- Description: "Pay online via UPI • Pickup after confirmation"
- CTA Button: "Start Ordering" — gradient button (amber to orange), with `hover:scale-105` and shadow

**If orders are disabled (settings.orders_enabled = false)**:
- Show a card with clock icon and "Ordering Unavailable" message
- Disable the "Start Ordering" button

**If hero loads**: Clicking "Start Ordering" reveals the order form below

---

### 5.1a Order Form (within Home Page)

**Back Button**: Arrow + "Back to Home" — text-amber-400, takes user back to hero. Clears the cart, form errors, and payment checkbox on click (cart does not persist across visits).

**Customer detail persistence**: Name and WhatsApp number are saved to `localStorage` (`tmp_customer`) and pre-filled on return. The cart and UTR field are never persisted — they reset on every visit.

**Section 1: Customer Details**
- Card: `bg-slate-800 rounded-lg p-6`
- Name input: text, required, min 2 chars, validation with red border on error
- WhatsApp number: tel input, maxLength 10 digits only, validation for Indian mobile (10 digits starting with 6-9)
- Helper text: "Enter 10-digit mobile number"
- Error states: red border + warning icon + error message

**Section 2: Available Items**
- Card: `bg-slate-800 rounded-lg p-6`
- Products fetched from `products` table filtered by `available = true`
- Each product row: `bg-slate-700 p-4 rounded-lg`
  - Left: Product name (font-semibold) + Price (₹{price}, amber text)
  - Right: `[-]` (red circle) + quantity (centered bold, `aria-live="polite"`) + `[+]` (green circle)
  - Stock validation: cannot add more than available stock
  - Toast error on overstock: "Only X items available for {product}"
  - Add/remove buttons have `aria-label`s (e.g., "Add one {name} to cart")
- Skeleton loading state when products are loading
- Empty state: PackageX icon + "No items available right now — check back soon." when no products exist

**Section 3: Cart Summary**
- Card: `bg-slate-800 rounded-lg p-6`
- Header: ShoppingCart icon + "Cart Summary"
- List each item: "{name} × {qty}" → "₹{subtotal}"
- Divider line + Total row: "Total:" → "₹{total}" (amber text, bold)
- Only shown when cart has items

**Section 4: Payment Details**
- Card: `bg-slate-800 rounded-lg p-6`

**Quick Pay Button** (if `settings.enable_quick_pay` is true):
- UPI deep link: `upi://pay?pa={upi_id}&pn=TMP%20at%20NU&am={total}&tn={unique_order_id}`
- Button: gradient emerald to cyan, text "Pay ₹{total} via UPI"
- Subtext: "This will open your UPI app with pre-filled payment details"
- Desktop fallback hint: On desktop browsers, shows "On desktop? Open this page on your phone to pay via UPI, or scan the QR code below."

**Order ID Card**:
- Label: "Order ID (Use as payment note)"
- Display: `{unique_order_id}` in monospace, yellow text, bold
- Format: `NU{DDMM}{4-char random}` (e.g., `NU2612A3B7`)
- Copy button: "Copy" — amber button, copies to clipboard
- Warning: "Use this Order ID as the payment note/remark when making the UPI payment"

**UPI ID Card**:
- Label: "Pay to UPI ID"
- Display: `{settings.upi_id}` in monospace, amber text
- Copy button

**QR Code Card**:
- Label: "Scan QR Code"
- 120x120px QR code generated via `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data={encoded_upi_link}`
- UPI link is URL-encoded with `encodeURIComponent` so `&` separators inside the deep link don't break the QR API URL
- White background rounded-lg

**UTR Input**:
- Label: "UTR/Reference Number (12-15 digits)"
- Input: numbers only, 12-15 digits, maxLength 15
- Validation: 12-15 digits, only numbers
- Helper: "Enter the UTR/Reference number from your UPI transaction"
- Error states: red border + warning

**Payment Confirmation Checkbox**:
- Text: "I confirm I've completed the payment and all the information I have provided is correct"
- Required before submitting

**Submit Button**:
- Full width, gradient amber to orange
- Disabled while submitting
- Loading state: spinner + "Submitting..."
- Text: "Submit Order"

**Confirmation Popup (before final submit)**:
- Modal overlay: `fixed inset-0 bg-black bg-opacity-60 z-50`
- Title: "Confirm Order Details"
- Order summary card with Name, WhatsApp, Total (emerald)
- Order ID display with copy button
- Warning: "Save this Order ID to track your order"
- Important notice: WhatsApp verification reminder
- Buttons: "Confirm & Submit" (emerald, with loading) and "Go Back" (slate)

**Success Screen** (after order submission):
- Full page centered card
- Green CheckCircle icon, large
- Title: "Order Placed!"
- Message: "Thanks! I'll message you on WhatsApp soon with pickup details."
- Order ID displayed: "Your Order ID: {id}" in monospace yellow text
- Trust note card: "All payments are verified manually before pickup. No cash accepted. For issues, message me on WhatsApp."
- Button: "Place Another Order" (amber) — clears cart, resets form errors/checkbox, generates new order ID
- Order is added to recent orders in `localStorage` (`tmp_recent_orders`, max 5)

---

### 5.2 Track Order Page

**Route**: Navigable via "Track Order" in navbar

**Layout**:
- `max-w-2xl mx-auto px-4 py-8`
- Heading: "Track Your Order" (gradient text)
- Subtext: "Enter your order ID to check status"

**Search Box**:
- Input: `p-4 bg-slate-700 rounded-lg border border-slate-600` with search icon
- Button: "Track" (amber)
- Search on Enter key
- Loading state: spinner + "Searching..."

**Recent Orders Panel** (shown before first search, if any exist):
- Header: History icon + "Recent Orders"
- Lists up to 5 recent order IDs from `localStorage` (`tmp_recent_orders`)
- Each row: order ID (monospace yellow) + customer name + date — click to track instantly

**Results (order found)**:
- Status card: icon + Order ID + status badge
  - Status badge colors: `Pending` = yellow, `Ready` = cyan, `Picked Up` = emerald
  - Status message: "Your order is being prepared." / "Your order is ready for pickup!" / "Order completed. Thank you!"
- Order details card: Name, Total (emerald), Items list

**Results (order not found)**:
- Card: "Order Not Found" with "Check your order ID and try again."

**Default state (before search)**:
- How to track instructions (numbered steps)
- Order status meanings card with colored dots
  - Pending (yellow), Ready (cyan), Picked Up (emerald)

---

### 5.3 Admin Page

**Route**: Navigable via "Admin" in navbar

**Access Control**: Password-based
- Password stored in `settings.admin_password` (set via admin panel)
- Password modal: overlay with title "Admin Login", password input, Login / Cancel buttons (Enter key submits)
- On success: `localStorage.setItem('admin_authenticated', 'true')` and stores password for edge-function calls
- Logout button (red) appears when on admin page, clears localStorage (`admin_authenticated` and `admin_password`)
- Password can be changed from admin settings

**Layout**: `max-w-7xl mx-auto px-4 py-8`

**Stats Cards (top row, 5 cards)**:
1. Total Products — Package icon (cyan), count of products
2. Pending Orders — Users icon (yellow), count of Pending orders
3. Today's Revenue — DollarSign icon (amber), sum of today's "Picked Up" orders
4. Total Revenue — DollarSign icon (emerald), sum of all "Picked Up" orders
5. Top Spender — CreditCard icon (blue), WhatsApp number as clickable link (wa.me), total amount. Sourced from the `top_spender` SQL view (computed server-side, not in JS).

**Shop Status Toggle Card**:
- Background: `emerald-950` with `emerald-600` border if open, `red-950` with `red-600` border if closed
- Icon: ShoppingBag (open) or PowerOff (closed)
- Text: "Shop is currently OPEN/CLOSED" (colored text)
- Button: "Open Shop" (emerald) or "Close Shop" (red) with toggle pill visual
- Toggles `settings.orders_enabled` via `admin-action` edge function
- Toast feedback: "Shop is now OPEN — orders accepted" / "Shop is now CLOSED — orders paused"

**Tabs (3 tabs)**:
- Products | Orders | Settings
- Active tab: `bg-amber-600 text-white`
- Inactive tab: `bg-slate-800 text-slate-300`

---

### 5.3a Products Tab

**Header**: "Products" + "Add Product" button (amber)

**Product Form** (inline, collapsible):
- Add: Empty form | Edit: Pre-populated
- Fields: Name, Price (₹), Stock Quantity, Available checkbox
- Buttons: "Add Product" / "Update Product" and "Cancel"
- Submit via `admin-action` edge function

**Products Table**:
- Header: Product, Price, Stock, Status, Actions
- Rows: Product name, Price (amber), Stock (colored: green if >0, red if 0), Status badge (emerald "Available" / red "Unavailable")
- Low-stock badge: amber "Low" pill shown next to stock when stock is between 1 and 3 (inclusive)
- Actions: Edit icon (pencil, cyan, with `aria-label`), Delete icon (red, with `aria-label`)
- Delete confirmation modal with focus trap (Tab cycles within, focus restores on close)
- Loading state: skeleton rows

---

### 5.3b Orders Tab

**Header**: "Orders" + Sort dropdown + "Refresh" button

**Sort Options**:
- Latest First (by created_at desc)
- Mobile Number (by whatsapp asc)
- Pending First (Pending at top, then by date)

**Order Cards**:
- Card: `bg-slate-800 rounded-lg p-6`
- Header: Order ID + Name + WhatsApp + date
- Status badge (colored: Pending=yellow, Ready=cyan, Picked Up=emerald) + Total (emerald, bold)
- Status dropdown (select): Pending / Ready / Picked Up
  - On change: calls `admin-action` edge function with `update_order_status`
  - Toast: "Order status updated successfully"
  - Order list updates locally from the realtime payload (no full refetch)
- Customer grid: Name, WhatsApp (clickable wa.me link), Transaction ID
- Items list: "{name} × {qty} = ₹{subtotal}" per item, in bg-slate-700 rows
- Real-time updates via Supabase `postgres_changes` subscription
  - On INSERT: new order prepended to list locally + toast notification + top spender refetched
  - On UPDATE: order updated in-place by id (no refetch)

**Pagination**: Orders are fetched in pages of 40 (initial load). A "Load More" button fetches the next 20 orders on demand, instead of loading all orders upfront.

**Loading state**: skeleton cards

---

### 5.3c Settings Tab

**App Settings Card**:
- Shop Name input
- UPI ID input
- Tagline input (placeholder: "Enter custom tagline")
- Enable Quick Pay checkbox
- Save button (amber)
- Submit via `admin-action` edge function

**Admin Password Card**:
- Current password display (hidden by default, toggleable with eye icon)
- "Change Password" button (cyan)
- When opened: New Password + Confirm Password inputs (both toggleable visibility)
- Validation: min 6 chars, passwords must match
- Submit via `admin-action` edge function
- Warning: "Make sure to remember your new password. You'll need it to access the admin panel."
- Success: updates localStorage password

---

## 6. Navigation Bar

**Sticky top bar** (`bg-slate-900 border-b border-slate-700 sticky top-0 z-40`):
- Left: Shop name (clickable, goes to home) — amber text, bold, 2xl
- Right links: Home, Track Order, Admin, Logout (when admin authenticated)
- Logout: red text, only visible when on admin page

**Top Banner** (above navbar):
- `bg-red-700 text-white py-2 px-4`
- Anti-smoking warning message
- Link to "ntcp.mohfw.gov.in" — yellow text, underlined

---

## 7. Toast System

- Position: `fixed top-4 right-4 z-50`
- Types: Success (emerald), Error (red), Info (cyan)
- Auto-dismiss: 3 seconds
- Manual close: X button
- Icons: CheckCircle, XCircle, AlertCircle
- Colors: `bg-emerald-900 border-emerald-500`, `bg-red-900 border-red-500`, `bg-cyan-900 border-cyan-500`

---

## 8. Loading States

- **Spinner**: `animate-spin` with `border-t-amber-500`
- **Skeletons**: `animate-pulse bg-slate-700` for:
  - Product cards (ProductCardSkeleton)
  - Order cards (OrderCardSkeleton)
  - Table rows (TableRowSkeleton)
  - Stats cards (LoadingSkeleton)
  - Settings cards

---

## 9. Edge Functions

### 9.1 process-order
**File**: `supabase/functions/process-order/index.ts`

**Purpose**: Validates stock, creates order, updates stock, sends Telegram notification

**Method**: POST

**Request Body**:
```json
{
  "name": "string",
  "whatsapp": "string",
  "items": [{"product_id": number, "product_name": "string", "quantity": number, "price": number}],
  "total": number,
  "transaction_id": "string",
  "unique_order_id": "string"
}
```

**Flow**:
1. Validate stock for each item (check `products.stock >= quantity` and `products.available = true`)
2. Insert into `orders` table
3. Call `send-telegram-notification` edge function (async, non-blocking)
4. Update product stock for each item
5. Return `{ success: true, order_id, message }`

**Error handling**: Returns 400 with error message for stock issues, invalid products

**CORS**: Must include exact headers for all requests

---

### 9.2 admin-action
**File**: `supabase/functions/admin-action/index.ts`

**Purpose**: Password-protected admin operations for all mutations

**Method**: POST

**Request Body**:
```json
{
  "action": "string",
  "password": "string",
  "payload": { ... }
}
```

**Actions**:
| Action | Payload | Effect |
|--------|---------|--------|
| `insert_product` | `{ name, price, stock, available }` | Insert into products |
| `update_product` | `{ id, name, price, stock, available }` | Update product by id |
| `delete_product` | `{ id }` | Delete product by id |
| `update_order_status` | `{ id, status }` | Update order status. Allowed: Pending, Ready, Picked Up |
| `update_settings` | `{ id, shop_name, upi_id, tagline, enable_quick_pay }` | Update settings |
| `insert_settings` | `{ shop_name, upi_id, tagline, enable_quick_pay, ... }` | Insert settings |
| `toggle_orders` | `{ id, orders_enabled }` | Toggle orders_enabled |
| `toggle_orders_insert` | `{ orders_enabled, ... }` | Insert settings for toggle |
| `change_password` | `{ id, new_password }` | Update admin_password (min 6 chars) |
| `change_password_insert` | `{ upi_id, tagline, enable_quick_pay, admin_password }` | Insert settings with new password |

**Security**:
1. Validates password against `settings.admin_password`
2. Returns 401 if no password, 403 if invalid
3. Uses service_role key for all DB operations (bypasses RLS)

**Error handling**: Returns 500 with error message for failures

**CORS**: Must include exact headers for all requests

---

### 9.3 cleanup-old-orders
**File**: `supabase/functions/cleanup-old-orders/index.ts`

**Purpose**: Deletes orders older than 10 days

**Method**: POST

**Flow**:
- Deletes orders where `created_at < NOW() - INTERVAL '10 days'`
- Returns `{ success, deletedCount, cutoffDate }`

**Called from**: Home page, auto-cleanup once per day (checks `last_cleanup` in localStorage)

---

### 9.4 send-telegram-notification
**File**: `supabase/functions/send-telegram-notification/index.ts`

**Purpose**: Sends Telegram message to admin when new order is placed

**Method**: POST

**Request Body**:
```json
{
  "order_id": "string",
  "unique_order_id": "string",
  "customer_name": "string",
  "whatsapp": "string",
  "total": number,
  "items": [{"product_name": "string", "quantity": number, "price": number}]
}
```

**Environment Variables**:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

**Message Format** (Markdown):
```
*NEW ORDER RECEIVED*

📦 *Order ID:* `unique_order_id`
👤 *Customer:* customer_name
📱 *WhatsApp:* +91{number}

📋 *Items Ordered:*
• {product_name} × {quantity} = ₹{subtotal}
...

💰 *Total Amount:* ₹{total}

⏰ *Status:* Pending

_Please verify payment and confirm order_
```

**Error handling**: Silent failure (doesn't break order placement)

---

## 10. Data Flow

### Customer Placing Order
1. Customer visits Home page
2. Frontend fetches products from Supabase REST API (public SELECT)
3. Customer clicks "Start Ordering", views products with quantity controls
4. Customer enters name, WhatsApp (10-digit), UTR number (12-15 digits)
5. Customer sees auto-generated Order ID, copies it, pays via UPI
6. Customer checks "payment confirmed" checkbox
7. Customer clicks "Submit Order" → Confirmation popup appears
8. Customer clicks "Confirm & Submit" → POST to `process-order` edge function
9. Edge function validates stock, inserts order, updates stock, sends Telegram
10. Frontend shows success screen with Order ID

### Admin Managing Products
1. Admin clicks "Admin" in navbar
2. Password modal appears (if not authenticated)
3. Admin enters password, validated against `settings.admin_password`
4. Admin navigates to Products tab
5. Click "Add Product" → form opens
6. Fill form, submit → POST to `admin-action` with `insert_product`
7. Edge function validates password, inserts into products
8. Product list auto-refreshes

### Admin Managing Orders
1. Admin goes to Orders tab
2. Real-time subscription listens to `orders` table changes
3. New orders appear automatically with toast notification
4. Admin can change status from dropdown → POST to `admin-action` with `update_order_status`
5. Order card reflects new status immediately

### Admin Managing Settings
1. Admin goes to Settings tab
2. Edit Shop Name, UPI ID, Tagline, Quick Pay toggle
3. Save → POST to `admin-action` with `update_settings`
4. Changes reflect on homepage (shop name, tagline, etc.)

---

## 11. Security Model

- **No traditional auth**: No sign-up, no login system. No OAuth, no email/password.
- **Admin password**: Single shared password stored in `settings.admin_password` (no hardcoded fallback)
- **Local storage**: `admin_authenticated` (bool) for session, `admin_password` (string) for edge function calls; both cleared on logout
- **RLS hardening**: After final migration, all tables have SELECT open for public, but no INSERT/UPDATE/DELETE directly. All mutations go through edge functions with `service_role` key.
- **Edge function security**: `admin-action` validates password against DB before any mutation. `process-order` validates stock before inserting.
- **Stock protection**: Orders are checked against product stock in the edge function. Stock is decremented atomically within the same function.
- **UTR validation**: Frontend validates 12-15 digits, numeric only. Admin can verify manually.
- **Telegram notifications**: Silent failure (don't break order placement if notification fails)

---

## 12. Key Features Summary

| Feature | Description |
|---------|-------------|
| Product browsing | View available products with prices and stock |
| Cart system | Add/remove items with quantity controls, real-time stock validation. Cart resets on leaving the form (not persisted). |
| Customer detail persistence | Name and WhatsApp saved to localStorage and pre-filled on return |
| Recent orders | Last 5 order IDs saved to localStorage, shown as click-to-track on the Track Order page |
| UPI payment | Deep-link UPI payment with pre-filled amount, order ID, UPI ID |
| Desktop UPI hint | Shows a fallback message on desktop browsers directing to QR scan |
| QR code | Auto-generated QR code for UPI payment |
| Order tracking | Track order status using unique order ID |
| Order management | Admin view of all orders with status updates (Pending/Ready/Picked Up) |
| Real-time updates | Supabase realtime subscription — orders update locally from payload (no full refetch) |
| Orders pagination | Admin orders load 40 initially with a "Load More" button (20 per page) |
| Shop toggle | Admin can open/close shop to pause/resume orders |
| Product management | Add, edit, delete products with stock management |
| Low-stock badge | Amber "Low" pill in admin products table when stock is 1-3 |
| Revenue tracking | Today's revenue, total revenue, top spender (via SQL view) |
| Products/settings cache | 30-second TTL in-memory cache to avoid refetching on navigation |
| Telegram notifications | Auto-notification on new orders |
| Password management | Admin can change password |
| Auto-cleanup | Orders older than 10 days are auto-deleted |
| WhatsApp integration | Clickable WhatsApp links for customer communication |
| Form validation | Client-side validation for name, WhatsApp, UTR |
| Loading states | Skeleton loaders and spinners for all async operations |
| Toast notifications | Success, error, info toasts with auto-dismiss, announced via aria-live |
| Accessibility | Skip-to-content, aria-labels, focus trap on modals, aria-describedby on form errors |
| Anti-smoking banner | Top banner with health warning |

---

## 13. Development Notes

- **Vite config**: Manual chunks for vendor (react), supabase, and icons (lucide-react) to improve caching
- **Build**: Uses `vite build` for production
- **TypeScript**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- **No React Router**: Single-page app with state-based navigation (home/admin/track)
- **Environment variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (edge functions)
- **No backend server**: All backend logic is in Supabase Edge Functions
- **No email/SMS**: Communication via WhatsApp and Telegram only
- **No PWA features**: No service worker, no offline mode
- **No image uploads**: No product images, no QR code upload
- **Products & settings cache**: A 30-second TTL in-memory cache (`src/lib/cache.ts`) avoids refetching products and settings when navigating between pages. Cache is invalidated after mutations (product add/edit/delete, settings save, shop toggle).
- **Orders pagination**: Admin orders tab fetches 40 initially with a "Load More" button (20 per page), instead of loading all orders upfront.
- **Cart does not persist**: The cart resets when leaving the order form or placing another order. Only customer name/WhatsApp persist (via `localStorage`).
- **Accessibility**: Skip-to-content link, `aria-label`s on icon-only buttons, `aria-live` on toast container and cart quantities, `aria-describedby` linking form errors to inputs, focus trap on modals (admin login, delete confirmation), `role="tablist"`/`aria-selected` on admin tabs, `aria-pressed` on the shop toggle, `aria-hidden` on decorative icons.

---

## 14. File Structure

```
project/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── utils.ts
│   │   ├── cache.ts
│   │   └── useFocusTrap.ts
│   └── components/
│       ├── HomePage.tsx
│       ├── TrackOrderPage.tsx
│       ├── AdminPage.tsx
│       └── ui/
│           ├── Toast.tsx
│           └── LoadingSpinner.tsx
└── supabase/
    ├── migrations/
    │   └── ... (schema, RLS, top_spender view)
    └── functions/
        ├── process-order/
        │   └── index.ts
        ├── admin-action/
        │   └── index.ts
        ├── cleanup-old-orders/
        │   └── index.ts
        └── send-telegram-notification/
            └── index.ts
```

---

## 15. Known Design Patterns

1. **Single source of truth**: All data from Supabase. No local state mirroring for data that changes.
2. **Edge functions for mutations**: All write operations go through edge functions, not direct Supabase client.
3. **Real-time subscriptions**: Admin page subscribes to `orders` table. INSERT and UPDATE events update the local list directly from the payload instead of refetching.
4. **Local storage for session and convenience**: Admin auth state (`admin_authenticated`, `admin_password`), customer details (`tmp_customer`), and recent order IDs (`tmp_recent_orders`) persist in localStorage. The cart is deliberately not persisted.
5. **No auth context**: The app uses a simple boolean state for auth, not a context provider.
6. **Toast system**: Global singleton pattern with callback registration. Container has `role="status"` and `aria-live="polite"`.
7. **Form validation**: Client-side validation with immediate error display, server-side validation in edge functions. Errors linked to inputs via `aria-describedby`.
8. **Stock management**: Optimistic cart updates, pessimistic stock validation before submit.
9. **In-memory TTL cache**: Products and settings are cached for 30 seconds (`src/lib/cache.ts`) to avoid refetching on page navigation. Cache is invalidated after mutations.
10. **Focus trap**: Modals (admin login, delete confirmation) use a reusable focus-trap hook (`src/lib/useFocusTrap.ts`) that cycles Tab within the modal and restores focus on close.
11. **SQL views for aggregates**: The `top_spender` view computes the highest-spending customer server-side, avoiding a full-table scan and in-JS aggregation on every admin page load.
