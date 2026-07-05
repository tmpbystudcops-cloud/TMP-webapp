"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge, statusMessage } from "@/components/order/StatusBadge";
import { fetchOrderByUniqueId } from "@/lib/data";
import { getRecentOrders, type RecentOrder } from "@/lib/local-storage";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="py-xl flex justify-center text-primary"><Spinner /></div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const params = useSearchParams();
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  useEffect(() => setRecent(getRecentOrders()), []);

  const track = useCallback(async (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    setSearched(true);
    setInput(id);
    try {
      const found = await fetchOrderByUniqueId(id);
      setOrder(found);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // auto-track from ?id=
  useEffect(() => {
    const id = params.get("id");
    if (id) track(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-lg pb-8">
      <div className="pt-2">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Track Your Order</h2>
        <p className="text-on-surface-variant">Enter your order ID to check its status.</p>
      </div>

      {/* Search box */}
      <div className="flex gap-sm">
        <div className="relative flex-grow">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && track(input)}
            placeholder="e.g. NU0307ABCD"
            className="w-full h-12 pl-12 pr-4 bg-surface-container rounded-full font-mono outline-none focus:ring-2 focus:ring-primary-container"
            aria-label="Order ID"
          />
        </div>
        <button
          onClick={() => track(input)}
          disabled={loading}
          className="h-12 px-lg bg-primary-container text-on-primary-container rounded-full font-label-md flex items-center gap-2 active:scale-95 transition disabled:opacity-60"
        >
          {loading ? <Spinner className="w-4 h-4" /> : "Track"}
        </button>
      </div>

      {/* Result */}
      {searched && !loading && order && <OrderResult order={order} />}
      {searched && !loading && !order && (
        <div className="bg-error-container/50 rounded-3xl p-lg text-center">
          <Icon name="search_off" className="text-3xl text-error" />
          <h3 className="font-headline-md text-headline-md text-on-surface mt-2">Order Not Found</h3>
          <p className="text-on-surface-variant">Check your order ID and try again.</p>
        </div>
      )}

      {/* Recent orders */}
      {!order && recent.length > 0 && (
        <section className="space-y-sm">
          <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider flex items-center gap-2">
            <Icon name="history" className="text-base" /> Recent Orders
          </h3>
          <div className="space-y-sm">
            {recent.map((r) => (
              <button
                key={r.unique_order_id}
                onClick={() => track(r.unique_order_id)}
                className="w-full bg-surface-container-lowest rounded-2xl p-md flex items-center justify-between shadow-sm border border-outline-variant/20 active:scale-[0.99] transition text-left"
              >
                <div>
                  <p className="font-mono font-bold text-secondary">{r.unique_order_id}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {r.name} · {formatDate(r.created_at)}
                  </p>
                </div>
                <Icon name="chevron_right" className="text-on-surface-variant" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Default help */}
      {!searched && recent.length === 0 && (
        <section className="bg-surface-container rounded-3xl p-lg space-y-3">
          <h3 className="font-headline-md text-headline-md text-on-surface">How to track</h3>
          <ol className="space-y-2 text-on-surface-variant list-decimal list-inside">
            <li>Enter the Order ID you received at checkout.</li>
            <li>Tap Track to see your current status.</li>
          </ol>
          <div className="border-t border-outline-variant/40 pt-3 space-y-2">
            <StatusMeaning color="bg-secondary-container" label="Pending — being prepared" />
            <StatusMeaning color="bg-info" label="Ready — ready for pickup" />
            <StatusMeaning color="bg-success" label="Picked Up — completed" />
          </div>
        </section>
      )}
    </div>
  );
}

function OrderResult({ order }: { order: Order }) {
  return (
    <div className="space-y-md animate-fade-in">
      <div className="bg-surface-container-lowest rounded-3xl p-lg shadow-sm border border-outline-variant/20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label-sm text-on-surface-variant">Order ID</p>
            <p className="font-mono font-bold text-secondary text-lg">{order.unique_order_id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-on-surface font-body-md">{statusMessage(order.status)}</p>
      </div>

      <div className="bg-surface-container rounded-3xl p-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Name</span>
          <span className="text-on-surface font-medium">{order.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Total</span>
          <span className="text-primary font-bold">{formatPrice(order.total)}</span>
        </div>
        <div className="border-t border-outline-variant/40 pt-2 space-y-1">
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between text-label-md">
              <span className="text-on-surface">
                {it.product_name} <span className="text-on-surface-variant">× {it.quantity}</span>
              </span>
              <span className="text-on-surface-variant">{formatPrice(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusMeaning({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-on-surface-variant text-label-md">{label}</span>
    </div>
  );
}
