"use client";

import { getSupabaseBrowser, isSupabaseConfiguredBrowser } from "./supabase/client";
import { DEMO_PRODUCTS, DEMO_SETTINGS } from "./demo-data";
import type { Product, PublicSettings, Order } from "./types";

// ---- 30s in-memory TTL cache (mirrors the original app's cache.ts) ----
const TTL = 30_000;
type CacheEntry<T> = { data: T; at: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.at < TTL) return entry.data;
  return null;
}
function setCached<T>(key: string, data: T) {
  cache.set(key, { data, at: Date.now() });
}
export function invalidateCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function fetchProducts(force = false): Promise<Product[]> {
  if (!isSupabaseConfiguredBrowser()) return DEMO_PRODUCTS; // preview mode
  if (!force) {
    const cached = getCached<Product[]>("products");
    if (cached) return cached;
  }
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const products = (data ?? []) as Product[];
  setCached("products", products);
  return products;
}

export async function fetchAvailableProducts(force = false): Promise<Product[]> {
  const all = await fetchProducts(force);
  return all.filter((p) => p.available);
}

export async function fetchSettings(force = false): Promise<PublicSettings | null> {
  if (!isSupabaseConfiguredBrowser()) return DEMO_SETTINGS; // preview mode
  if (!force) {
    const cached = getCached<PublicSettings>("settings");
    if (cached) return cached;
  }
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("settings_public")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) setCached("settings", data as PublicSettings);
  return (data as PublicSettings) ?? null;
}

export async function fetchOrderByUniqueId(uniqueId: string): Promise<Order | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("unique_order_id", uniqueId.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}
