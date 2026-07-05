import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deletes orders older than 10 days. Protected: requires either the admin
// password (called from the authenticated admin dashboard, once/day) or a
// CRON_SECRET bearer token (for a scheduled job).
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const viaCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!viaCron) {
    let password: unknown;
    try {
      ({ password } = await req.json());
    } catch {
      password = undefined;
    }
    const auth = await verifyAdminPassword(password);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
  }

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deletedCount: data?.length ?? 0,
    cutoffDate: cutoff,
  });
}
