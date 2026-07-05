"use client";

import type { Order, Product, Settings } from "./types";
import { LS_ADMIN_PASSWORD } from "./constants";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false || data?.ok === false) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// ---- customer ----
export interface PlaceOrderInput {
  name: string;
  whatsapp: string;
  items: { product_id: number; quantity: number }[];
  transaction_id: string;
  unique_order_id: string;
}

export function placeOrder(input: PlaceOrderInput) {
  return postJson<{ success: true; order_id: number; unique_order_id: string; total: number }>(
    "/api/process-order",
    input
  );
}

// Admin-authenticated cleanup of old orders (best-effort, called once/day from admin).
export async function triggerCleanup(): Promise<void> {
  if (typeof window === "undefined") return;
  const password = localStorage.getItem(LS_ADMIN_PASSWORD) ?? "";
  if (!password) return;
  try {
    await fetch("/api/cleanup-old-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    /* best-effort */
  }
}

// ---- admin ----
function getAdminPassword(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_ADMIN_PASSWORD) ?? "";
}

export function adminLogin(password: string) {
  return postJson<{ ok: true }>("/api/admin/login", { password });
}

export function adminAction<T = { success: true }>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  return postJson<T>("/api/admin-action", {
    action,
    password: getAdminPassword(),
    payload,
  });
}

export async function adminFetchSettings(): Promise<Settings> {
  const res = await fetch("/api/admin-action", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: getAdminPassword() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.error || "Failed to load settings");
  return data.settings as Settings;
}

// convenience typed wrappers
export const adminInsertProduct = (p: Partial<Product>) => adminAction("insert_product", p as Record<string, unknown>);
export const adminUpdateProduct = (p: Partial<Product>) => adminAction("update_product", p as Record<string, unknown>);
export const adminDeleteProduct = (id: number) => adminAction("delete_product", { id });
export const adminUpdateOrderStatus = (id: number, status: string) =>
  adminAction<{ success: true; order: Order }>("update_order_status", { id, status });
export const adminToggleOrders = (orders_enabled: boolean) =>
  adminAction<{ success: true; settings: Settings }>("toggle_orders", { orders_enabled });
export const adminChangePassword = (new_password: string) =>
  adminAction("change_password", { new_password });
