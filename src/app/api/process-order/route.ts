import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { isValidWhatsApp, isValidUtr } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  name?: string;
  whatsapp?: string;
  items?: { product_id: number; quantity: number }[];
  transaction_id?: string;
  unique_order_id?: string;
}

// Map a coded exception message from place_order() to a friendly response.
function mapRpcError(message: string): { status: number; error: string } {
  if (message.includes("SHOP_CLOSED"))
    return { status: 403, error: "The shop is currently closed. Please try again later." };
  if (message.includes("EMPTY_CART")) return { status: 400, error: "Your cart is empty" };
  if (message.includes("BAD_ITEM")) return { status: 400, error: "Invalid item in cart" };
  if (message.includes("BAD_TOTAL")) return { status: 400, error: "Invalid order total" };

  const stock = message.match(/STOCK:(\d+):(.+)$/);
  if (stock) return { status: 400, error: `Only ${stock[1]} × ${stock[2].trim()} available` };

  const unavailable = message.match(/UNAVAILABLE:(.+)$/);
  if (unavailable) return { status: 400, error: `${unavailable[1].trim()} is no longer available` };

  if (message.includes("duplicate key") || message.includes("unique_order_id"))
    return { status: 409, error: "Duplicate order id, please try again" };

  return { status: 500, error: "Could not place order" };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const whatsapp = (body.whatsapp ?? "").trim();
  const transactionId = (body.transaction_id ?? "").trim();
  const uniqueOrderId = (body.unique_order_id ?? "").trim().toUpperCase();
  const rawItems = Array.isArray(body.items) ? body.items : [];

  // ---- basic input validation ----
  if (name.length < 2) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
  if (!isValidWhatsApp(whatsapp))
    return NextResponse.json({ success: false, error: "Invalid WhatsApp number" }, { status: 400 });
  if (!isValidUtr(transactionId))
    return NextResponse.json({ success: false, error: "Invalid UTR/reference number" }, { status: 400 });
  if (!uniqueOrderId) return NextResponse.json({ success: false, error: "Missing order id" }, { status: 400 });
  if (rawItems.length === 0)
    return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });

  // ---- consolidate quantities per product (defensive; client cart is already unique) ----
  const qtyById = new Map<number, number>();
  for (const it of rawItems) {
    const id = Number(it.product_id);
    const qty = Math.floor(Number(it.quantity));
    if (!Number.isFinite(id) || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ success: false, error: "Invalid item in cart" }, { status: 400 });
    }
    qtyById.set(id, (qtyById.get(id) ?? 0) + qty);
  }
  const items = [...qtyById.entries()].map(([product_id, quantity]) => ({ product_id, quantity }));

  const supabase = getSupabaseAdmin();

  // ---- atomic placement (validates stock, inserts, decrements in one transaction) ----
  const { data, error } = await supabase.rpc("place_order", {
    p_name: name,
    p_whatsapp: whatsapp,
    p_items: items,
    p_transaction_id: transactionId,
    p_unique_order_id: uniqueOrderId,
  });

  if (error) {
    const mapped = mapRpcError(error.message || "");
    return NextResponse.json({ success: false, error: mapped.error }, { status: mapped.status });
  }

  const order = data as Order;

  // ---- fire Telegram notification (silent, never blocks) ----
  await sendTelegramNotification({
    unique_order_id: order.unique_order_id,
    customer_name: order.name,
    whatsapp: order.whatsapp,
    total: order.total,
    items: order.items,
  });

  return NextResponse.json({
    success: true,
    order_id: order.id,
    unique_order_id: order.unique_order_id,
    total: order.total,
    message: "Order placed",
  });
}
