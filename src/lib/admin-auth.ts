import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import type { Settings } from "./types";

// Fetch the single settings row (service-role, includes admin_password).
export async function getSettingsRow(): Promise<Settings | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Settings) ?? null;
}

export type AuthResult =
  | { ok: true; settings: Settings }
  | { ok: false; status: 401 | 403; message: string };

// Validate a supplied admin password against settings.admin_password.
export async function verifyAdminPassword(password: unknown): Promise<AuthResult> {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, status: 401, message: "Password required" };
  }
  const settings = await getSettingsRow();
  if (!settings || !settings.admin_password) {
    return { ok: false, status: 403, message: "Admin password not configured" };
  }
  if (settings.admin_password !== password) {
    return { ok: false, status: 403, message: "Invalid password" };
  }
  return { ok: true, settings };
}
