"use client";

import { getSupabaseBrowser } from "./supabase/client";
import type { Order, TopSpender } from "./types";

export interface OrderStats {
  pending_count: number;
  total_revenue: number;
  today_revenue: number;
  total_orders: number;
}

export async function fetchOrderStats(): Promise<OrderStats> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.from("order_stats").select("*").maybeSingle();
  if (error) throw error;
  return (
    (data as OrderStats) ?? {
      pending_count: 0,
      total_revenue: 0,
      today_revenue: 0,
      total_orders: 0,
    }
  );
}

export async function fetchTopSpender(): Promise<TopSpender | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.from("top_spender").select("*").maybeSingle();
  if (error) throw error;
  return (data as TopSpender) ?? null;
}

export type OrderSort = "latest" | "mobile" | "pending";

export async function fetchOrdersPage(
  offset: number,
  limit: number,
  sort: OrderSort
): Promise<Order[]> {
  const supabase = getSupabaseBrowser();
  let query = supabase.from("orders").select("*");

  if (sort === "mobile") {
    query = query.order("whatsapp", { ascending: true }).order("created_at", { ascending: false });
  } else {
    // "latest" and "pending" both order by newest first; "pending" is re-sorted client-side
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as Order[];
}
