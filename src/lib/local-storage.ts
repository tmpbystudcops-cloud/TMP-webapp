"use client";

import { LS_CUSTOMER, LS_RECENT_ORDERS, MAX_RECENT_ORDERS } from "./constants";

export interface SavedCustomer {
  name: string;
  whatsapp: string;
}

export interface RecentOrder {
  unique_order_id: string;
  name: string;
  total: number;
  created_at: string;
}

export function getCustomer(): SavedCustomer | null {
  try {
    const raw = localStorage.getItem(LS_CUSTOMER);
    return raw ? (JSON.parse(raw) as SavedCustomer) : null;
  } catch {
    return null;
  }
}

export function saveCustomer(c: SavedCustomer) {
  try {
    localStorage.setItem(LS_CUSTOMER, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export function getRecentOrders(): RecentOrder[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_ORDERS);
    const parsed = raw ? (JSON.parse(raw) as RecentOrder[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentOrder(order: RecentOrder) {
  try {
    const existing = getRecentOrders().filter(
      (o) => o.unique_order_id !== order.unique_order_id
    );
    const next = [order, ...existing].slice(0, MAX_RECENT_ORDERS);
    localStorage.setItem(LS_RECENT_ORDERS, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
