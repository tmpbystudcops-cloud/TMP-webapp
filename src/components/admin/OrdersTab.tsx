"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { OrderCardSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/order/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { fetchOrdersPage, type OrderSort } from "@/lib/admin-data";
import { adminUpdateOrderStatus } from "@/lib/api";
import { formatPrice, formatDate, waLink } from "@/lib/utils";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/types";

const PAGE_SIZE = 40;
const MORE_SIZE = 20;

export function OrdersTab({ onOrdersChanged }: { onOrdersChanged: () => void }) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<OrderSort>("latest");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const changedRef = useRef(onOrdersChanged);
  changedRef.current = onOrdersChanged;
  // Number of rows fetched from the server so far — used as the pagination
  // offset. Kept separate from `orders.length` so realtime-prepended rows
  // don't inflate the offset and cause skipped/duplicated pages.
  const serverCountRef = useRef(0);

  const load = useCallback(async (s: OrderSort) => {
    setLoading(true);
    try {
      const page = await fetchOrdersPage(0, PAGE_SIZE, s);
      setOrders(page);
      serverCountRef.current = page.length;
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(sort);
  }, [sort, load]);

  // ---- realtime ----
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("orders-admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as Order;
        setOrders((prev) => (prev.some((o) => o.id === row.id) ? prev : [row, ...prev]));
        toast.info(`New order ${row.unique_order_id}`);
        changedRef.current();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as Order;
        setOrders((prev) => prev.map((o) => (o.id === row.id ? row : o)));
        changedRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchOrdersPage(serverCountRef.current, MORE_SIZE, sort);
      serverCountRef.current += page.length;
      setOrders((prev) => [...prev, ...page.filter((p) => !prev.some((o) => o.id === p.id))]);
      setHasMore(page.length === MORE_SIZE);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    if (status === order.status) return;
    setUpdatingId(order.id);
    // optimistic
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await adminUpdateOrderStatus(order.id, status);
      toast.success("Order status updated");
      changedRef.current();
    } catch (e) {
      // revert
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o)));
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  // Re-apply the active sort client-side so realtime-prepended rows (which always
  // arrive at the top) don't break the ordering for non-"latest" sorts.
  const displayed = useMemo(() => {
    if (sort === "latest") return orders;
    if (sort === "mobile") {
      return [...orders].sort((a, b) => {
        const c = a.whatsapp.localeCompare(b.whatsapp);
        if (c !== 0) return c;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    // pending first
    const rank = (s: OrderStatus) => (s === "Pending" ? 0 : 1);
    return [...orders].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders, sort]);

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-md text-headline-md text-on-surface">Orders</h3>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as OrderSort)}
            className="h-9 px-3 bg-surface-container rounded-full text-label-sm outline-none"
            aria-label="Sort orders"
          >
            <option value="latest">Latest first</option>
            <option value="pending">Pending first</option>
            <option value="mobile">By mobile</option>
          </select>
          <button
            onClick={() => load(sort)}
            aria-label="Refresh"
            className="w-9 h-9 rounded-full bg-info/10 text-info flex items-center justify-center active:scale-90 transition"
          >
            <Icon name="refresh" className="text-base" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-md">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-on-surface-variant text-center py-6">No orders yet.</p>
      ) : (
        <>
          <div className="space-y-md">
            {displayed.map((order) => (
              <div
                key={order.id}
                className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/20 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-secondary">{order.unique_order_id}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {order.name} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span className="font-bold text-primary flex-shrink-0">{formatPrice(order.total)}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-label-sm">
                  <a
                    href={waLink(order.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-info"
                  >
                    <Icon name="chat" className="text-sm" /> +91{order.whatsapp}
                  </a>
                  <span className="text-on-surface-variant">· UTR {order.transaction_id}</span>
                </div>

                {/* items */}
                <div className="bg-surface-container rounded-xl p-2 space-y-1">
                  {order.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-label-sm">
                      <span className="text-on-surface">
                        {it.product_name} × {it.quantity}
                      </span>
                      <span className="text-on-surface-variant">{formatPrice(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* status control */}
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={order.status} />
                  <div className="flex items-center gap-2">
                    {updatingId === order.id && <Spinner className="w-4 h-4 text-primary" />}
                    <select
                      value={order.status}
                      onChange={(e) => changeStatus(order, e.target.value as OrderStatus)}
                      disabled={updatingId === order.id}
                      className="h-9 px-3 bg-surface-container rounded-full text-label-sm outline-none"
                      aria-label={`Update status for ${order.unique_order_id}`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full h-11 rounded-full bg-surface-container-high text-on-surface font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
            >
              {loadingMore ? <Spinner className="w-4 h-4" /> : <Icon name="expand_more" />}
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
