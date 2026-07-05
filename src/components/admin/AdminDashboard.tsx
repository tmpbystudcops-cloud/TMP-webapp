"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { fetchOrderStats, fetchTopSpender, type OrderStats } from "@/lib/admin-data";
import { fetchSettings, invalidateCache } from "@/lib/data";
import { adminToggleOrders, triggerCleanup } from "@/lib/api";
import { formatPrice, waLink } from "@/lib/utils";
import { LS_LAST_CLEANUP } from "@/lib/constants";
import type { PublicSettings, TopSpender } from "@/lib/types";
import { ProductsTab } from "./ProductsTab";
import { OrdersTab } from "./OrdersTab";
import { SettingsTab } from "./SettingsTab";

type Tab = "products" | "orders" | "settings";

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("orders");
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [topSpender, setTopSpender] = useState<TopSpender | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const [s, ts] = await Promise.all([fetchOrderStats(), fetchTopSpender()]);
      setStats(s);
      setTopSpender(ts);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await fetchSettings(true));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadSettings();
    // opportunistic cleanup of old orders, at most once per day
    try {
      const last = localStorage.getItem(LS_LAST_CLEANUP);
      const oneDay = 24 * 60 * 60 * 1000;
      if (!last || Date.now() - Number(last) > oneDay) {
        triggerCleanup();
        localStorage.setItem(LS_LAST_CLEANUP, String(Date.now()));
      }
    } catch {
      /* ignore */
    }
  }, [loadStats, loadSettings]);

  async function toggleShop() {
    if (!settings) return;
    setToggling(true);
    try {
      const res = await adminToggleOrders(!settings.orders_enabled);
      invalidateCache("settings");
      setSettings((prev) => (prev ? { ...prev, orders_enabled: res.settings.orders_enabled } : prev));
      toast.success(
        res.settings.orders_enabled ? "Shop is now OPEN — orders accepted" : "Shop is now CLOSED — orders paused"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle shop");
    } finally {
      setToggling(false);
    }
  }

  const open = settings?.orders_enabled ?? true;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface shadow-sm px-container-margin py-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="admin_panel_settings" className="text-primary text-2xl" fill />
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-on-surface-variant hover:text-primary p-2" aria-label="Back to shop">
            <Icon name="storefront" />
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-error font-label-sm bg-error-container/50 px-3 py-1.5 rounded-full"
          >
            <Icon name="logout" className="text-sm" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-container-margin pt-md space-y-lg">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-md">
          <StatCard icon="inventory_2" tint="text-info" label="Products" value={productCount != null ? String(productCount) : null} />
          <StatCard icon="pending_actions" tint="text-warning" label="Pending" value={stats ? String(stats.pending_count) : null} />
          <StatCard icon="today" tint="text-primary" label="Today's Revenue" value={stats ? formatPrice(stats.today_revenue) : null} />
          <StatCard icon="payments" tint="text-success" label="Total Revenue" value={stats ? formatPrice(stats.total_revenue) : null} />
        </div>

        {/* Top spender */}
        <div className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center">
              <Icon name="workspace_premium" className="text-secondary" fill />
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Top Spender</p>
              {topSpender ? (
                <a href={waLink(topSpender.whatsapp)} target="_blank" rel="noreferrer" className="font-bold text-on-surface">
                  {topSpender.name} <span className="text-on-surface-variant font-normal">· +91{topSpender.whatsapp}</span>
                </a>
              ) : (
                <p className="text-on-surface-variant">—</p>
              )}
            </div>
          </div>
          {topSpender && <span className="font-bold text-primary">{formatPrice(topSpender.total)}</span>}
        </div>

        {/* Shop toggle */}
        <div
          className={`rounded-2xl p-md flex items-center justify-between border ${
            open ? "bg-success/10 border-success/40" : "bg-error-container/60 border-error/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon name={open ? "storefront" : "power_settings_new"} className={open ? "text-success" : "text-error"} fill />
            <div>
              <p className={`font-headline-md text-headline-md ${open ? "text-success" : "text-error"}`}>
                Shop is {open ? "OPEN" : "CLOSED"}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {open ? "Accepting new orders" : "New orders are paused"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleShop}
            disabled={toggling || !settings}
            aria-pressed={open}
            className={`h-10 px-lg rounded-full font-label-md text-white flex items-center gap-2 active:scale-95 transition disabled:opacity-60 ${
              open ? "bg-error" : "bg-success"
            }`}
          >
            {toggling ? <Spinner className="w-4 h-4" /> : <Icon name={open ? "lock" : "lock_open"} className="text-sm" />}
            {open ? "Close" : "Open"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-surface-container p-1 rounded-full" role="tablist">
          {(["orders", "products", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 h-10 rounded-full font-label-md capitalize transition ${
                tab === t ? "bg-primary-container text-on-primary-container shadow" : "text-on-surface-variant"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "products" && <ProductsTab onCountChange={setProductCount} />}
        {tab === "orders" && <OrdersTab onOrdersChanged={loadStats} />}
        {tab === "settings" && <SettingsTab onSaved={loadSettings} />}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tint,
  label,
  value,
}: {
  icon: string;
  tint: string;
  label: string;
  value: string | null;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/20">
      <Icon name={icon} className={`${tint} text-2xl`} fill />
      <p className="text-label-sm text-on-surface-variant mt-1">{label}</p>
      {value == null ? <Skeleton className="h-6 w-16 mt-1" /> : <p className="font-headline-md text-headline-md text-on-surface">{value}</p>}
    </div>
  );
}
