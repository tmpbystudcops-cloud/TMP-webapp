import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const result = await verifyAdminPassword(password);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
