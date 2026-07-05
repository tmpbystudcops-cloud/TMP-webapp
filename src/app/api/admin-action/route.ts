import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyAdminPassword, getSettingsRow } from "@/lib/admin-auth";
import type { Category, OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES: Category[] = ["drinks", "chips", "hot", "sweets", "healthy", "other"];
const VALID_STATUSES: OrderStatus[] = ["Pending", "Ready", "Picked Up"];

interface Body {
  action?: string;
  password?: string;
  payload?: Record<string, unknown>;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

interface ProductValues {
  name: string;
  price: number;
  stock: number;
  available: boolean;
  featured: boolean;
  category: Category;
  description: string | null;
  image_url: string | null;
  original_price: number | null;
}

type ParseResult = { ok: false; error: string } | { ok: true; value: ProductValues };

// Coerce & validate a product payload for insert/update.
function parseProduct(p: Record<string, unknown>): ParseResult {
  const name = String(p.name ?? "").trim();
  const price = Number(p.price);
  const stock = Math.floor(Number(p.stock));
  const available = Boolean(p.available);
  const featured = Boolean(p.featured);
  const category = String(p.category ?? "other") as Category;
  const description = p.description ? String(p.description).trim() : null;
  const image_url = p.image_url ? String(p.image_url).trim() : null;
  const original_price =
    p.original_price === "" || p.original_price == null ? null : Number(p.original_price);

  if (name.length < 1) return { ok: false, error: "Product name is required" };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Price must be greater than 0" };
  if (!Number.isFinite(stock) || stock < 0) return { ok: false, error: "Stock must be 0 or more" };
  if (!VALID_CATEGORIES.includes(category)) return { ok: false, error: "Invalid category" };
  if (original_price !== null && (!Number.isFinite(original_price) || original_price <= 0))
    return { ok: false, error: "Original price must be greater than 0" };

  return {
    ok: true,
    value: { name, price, stock, available, featured, category, description, image_url, original_price },
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const auth = await verifyAdminPassword(body.password);
  if (!auth.ok) return bad(auth.message, auth.status);

  const supabase = getSupabaseAdmin();
  const action = body.action;
  const payload = body.payload ?? {};

  try {
    switch (action) {
      case "insert_product": {
        const parsed = parseProduct(payload);
        if (!parsed.ok) return bad(parsed.error);
        const { data, error } = await supabase.from("products").insert(parsed.value).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, product: data });
      }

      case "update_product": {
        const id = Number(payload.id);
        if (!Number.isFinite(id)) return bad("Missing product id");
        const parsed = parseProduct(payload);
        if (!parsed.ok) return bad(parsed.error);
        const { data, error } = await supabase
          .from("products")
          .update(parsed.value)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, product: data });
      }

      case "delete_product": {
        const id = Number(payload.id);
        if (!Number.isFinite(id)) return bad("Missing product id");
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      case "update_order_status": {
        const id = Number(payload.id);
        const status = String(payload.status) as OrderStatus;
        if (!Number.isFinite(id)) return bad("Missing order id");
        if (!VALID_STATUSES.includes(status)) return bad("Invalid status");
        const { data, error } = await supabase
          .from("orders")
          .update({ status })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, order: data });
      }

      case "update_settings": {
        const settings = auth.settings;
        const update = {
          shop_name: String(payload.shop_name ?? settings.shop_name).trim(),
          upi_id: String(payload.upi_id ?? settings.upi_id).trim(),
          tagline: String(payload.tagline ?? settings.tagline).trim(),
          enable_quick_pay: Boolean(payload.enable_quick_pay),
          qr_code_url: payload.qr_code_url ? String(payload.qr_code_url).trim() : settings.qr_code_url,
        };
        if (!update.upi_id) return bad("UPI ID is required");
        const { data, error } = await supabase
          .from("settings")
          .update(update)
          .eq("id", settings.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, settings: data });
      }

      case "toggle_orders": {
        const enabled = Boolean(payload.orders_enabled);
        const { data, error } = await supabase
          .from("settings")
          .update({ orders_enabled: enabled })
          .eq("id", auth.settings.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, settings: data });
      }

      case "change_password": {
        const newPassword = String(payload.new_password ?? "");
        if (newPassword.length < 6) return bad("Password must be at least 6 characters");
        const { error } = await supabase
          .from("settings")
          .update({ admin_password: newPassword })
          .eq("id", auth.settings.id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      default:
        return bad("Unknown action");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Also allow reading full settings (with password) for the admin settings tab
export async function PUT(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }
  const auth = await verifyAdminPassword(body.password);
  if (!auth.ok) return bad(auth.message, auth.status);
  const settings = await getSettingsRow();
  return NextResponse.json({ success: true, settings });
}
