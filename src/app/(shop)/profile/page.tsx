"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getCustomer,
  saveCustomer,
  getRecentOrders,
  type RecentOrder,
} from "@/lib/local-storage";
import { isValidWhatsApp, formatPrice, formatDate } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export default function ProfilePage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const c = getCustomer();
    if (c) {
      setName(c.name);
      setWhatsapp(c.whatsapp);
    }
    setRecent(getRecentOrders());
    setLoaded(true);
  }, []);

  function save() {
    if (name.trim().length < 2) return toast.error("Enter your name (2+ characters).");
    if (!isValidWhatsApp(whatsapp)) return toast.error("Enter a valid 10-digit mobile number.");
    saveCustomer({ name: name.trim(), whatsapp: whatsapp.trim() });
    toast.success("Details saved");
  }

  return (
    <div className="space-y-lg pb-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-20 h-20 rounded-full bg-primary-container/15 border-2 border-primary-fixed flex items-center justify-center">
          <Icon name="person" className="text-4xl text-primary" fill />
        </div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-2">
          {name || "Welcome, Wildcat"}
        </h2>
        <p className="text-on-surface-variant">Manage your details & orders</p>
      </div>

      {/* Saved details */}
      <section className="bg-surface-container-lowest rounded-3xl p-lg shadow-sm border border-outline-variant/20 space-y-md">
        <h3 className="font-headline-md text-headline-md text-on-surface">Your Details</h3>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full h-12 px-4 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface">WhatsApp number</label>
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant">+91</span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              inputMode="numeric"
              className="w-full h-12 px-4 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
        </div>
        <button
          onClick={save}
          className="w-full h-12 bg-primary-container text-on-primary-container rounded-full font-label-md flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <Icon name="save" />
          Save details
        </button>
        <p className="text-label-sm text-on-surface-variant text-center">
          Saved on this device — no account needed. We&apos;ll pre-fill these at checkout.
        </p>
      </section>

      {/* Order history */}
      <section className="space-y-sm">
        <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider flex items-center gap-2">
          <Icon name="receipt_long" className="text-base" /> Order History
        </h3>
        {loaded && recent.length === 0 ? (
          <div className="bg-surface-container rounded-3xl">
            <EmptyState icon="receipt_long" title="No orders yet" message="Your recent orders will show up here." />
          </div>
        ) : (
          <div className="space-y-sm">
            {recent.map((r) => (
              <Link
                key={r.unique_order_id}
                href={`/orders?id=${r.unique_order_id}`}
                className="w-full bg-surface-container-lowest rounded-2xl p-md flex items-center justify-between shadow-sm border border-outline-variant/20 active:scale-[0.99] transition"
              >
                <div>
                  <p className="font-mono font-bold text-secondary">{r.unique_order_id}</p>
                  <p className="text-label-sm text-on-surface-variant">{formatDate(r.created_at)}</p>
                </div>
                <span className="text-primary font-bold">{formatPrice(r.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Links */}
      <section className="space-y-sm">
        <LinkRow href="/orders" icon="local_shipping" label="Track an order" />
        <LinkRow href="/admin" icon="admin_panel_settings" label="Shop admin" />
      </section>

      <p className="text-center text-label-sm text-on-surface-variant pt-2">{APP_NAME}</p>
    </div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="w-full bg-surface-container rounded-2xl p-md flex items-center justify-between active:scale-[0.99] transition"
    >
      <span className="flex items-center gap-3 text-on-surface font-label-md">
        <Icon name={icon} className="text-primary" />
        {label}
      </span>
      <Icon name="chevron_right" className="text-on-surface-variant" />
    </Link>
  );
}
