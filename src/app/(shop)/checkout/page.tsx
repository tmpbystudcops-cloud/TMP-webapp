"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { fetchSettings } from "@/lib/data";
import { placeOrder } from "@/lib/api";
import { getCustomer, saveCustomer, addRecentOrder } from "@/lib/local-storage";
import {
  buildUpiLink,
  buildQrUrl,
  formatPrice,
  generateOrderId,
  isValidWhatsApp,
  isValidUtr,
  copyToClipboard,
  isDesktop,
} from "@/lib/utils";
import type { PublicSettings } from "@/lib/types";

interface Placed {
  unique_order_id: string;
  total: number;
}

export default function CheckoutPage() {
  const { lines, subtotal, clear, hydrated } = useCart();
  const toast = useToast();

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [utr, setUtr] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string; utr?: string; confirm?: string }>({});

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [desktop, setDesktop] = useState(false);

  const [orderId, setOrderId] = useState<string>("");

  // generate an order id once on mount
  useEffect(() => setOrderId(generateOrderId()), []);
  useEffect(() => setDesktop(isDesktop()), []);

  // prefill saved customer + load settings
  useEffect(() => {
    const c = getCustomer();
    if (c) {
      setName(c.name);
      setWhatsapp(c.whatsapp);
    }
    fetchSettings()
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setSettingsLoaded(true));
  }, []);

  const upiLink = useMemo(
    () => (settings ? buildUpiLink(settings.upi_id, subtotal, orderId) : ""),
    [settings, subtotal, orderId]
  );
  const qrUrl = useMemo(() => (upiLink ? buildQrUrl(upiLink, 200) : ""), [upiLink]);

  const shopClosed = settings ? !settings.orders_enabled : false;

  function validate(): boolean {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = "Please enter your name (2+ characters).";
    if (!isValidWhatsApp(whatsapp)) e.whatsapp = "Enter a valid 10-digit mobile number.";
    if (!isValidUtr(utr)) e.utr = "Enter the 12–15 digit UTR/reference number.";
    if (!confirmed) e.confirm = "Please confirm your payment to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit() {
    if (shopClosed) {
      toast.error("The shop is currently closed.");
      return;
    }
    if (validate()) setShowConfirm(true);
  }

  async function confirmSubmit() {
    setSubmitting(true);
    try {
      const res = await placeOrder({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        transaction_id: utr.trim(),
        unique_order_id: orderId,
      });
      saveCustomer({ name: name.trim(), whatsapp: whatsapp.trim() });
      addRecentOrder({
        unique_order_id: res.unique_order_id,
        name: name.trim(),
        total: res.total,
        created_at: new Date().toISOString(),
      });
      setPlaced({ unique_order_id: res.unique_order_id, total: res.total });
      setShowConfirm(false);
      clear();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not place order";
      // A duplicate order-id is unrecoverable with the same id — mint a fresh one so a retry can succeed.
      if (/duplicate order id/i.test(msg)) setOrderId(generateOrderId());
      toast.error(msg);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? `${label} copied` : "Copy failed");
  }

  // ---- success screen ----
  if (placed) {
    return (
      <div className="flex flex-col items-center text-center py-xl space-y-md">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="check_circle" className="text-5xl text-primary" fill />
        </div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Order Placed!</h2>
        <p className="text-on-surface-variant max-w-xs">
          Thanks! I&apos;ll message you on WhatsApp soon with pickup details.
        </p>
        <div className="bg-surface-container rounded-2xl px-lg py-md">
          <p className="text-label-sm text-on-surface-variant">Your Order ID</p>
          <p className="font-mono font-bold text-lg text-primary tracking-wider">{placed.unique_order_id}</p>
        </div>
        <div className="bg-secondary-fixed/40 rounded-2xl p-md text-label-sm text-on-secondary-fixed max-w-sm">
          All payments are verified manually before pickup. No cash accepted. For issues, message me on WhatsApp.
        </div>
        <div className="flex flex-col gap-sm w-full max-w-xs pt-2">
          <Link
            href={`/orders?id=${placed.unique_order_id}`}
            className="w-full h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center gap-2 font-label-md shadow active:scale-95 transition"
          >
            <Icon name="receipt_long" />
            Track this order
          </Link>
          <Link
            href="/"
            className="w-full h-12 bg-surface-container-high text-on-surface rounded-full flex items-center justify-center gap-2 font-label-md active:scale-95 transition"
          >
            Place another order
          </Link>
        </div>
      </div>
    );
  }

  // ---- empty cart guard ----
  if (hydrated && lines.length === 0) {
    return (
      <div className="py-xl">
        <EmptyState icon="shopping_cart_off" title="Nothing to check out" message="Your cart is empty.">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-lg py-3 rounded-full font-label-md shadow active:scale-95 transition"
          >
            <Icon name="storefront" />
            Browse snacks
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-lg pb-8">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/cart" aria-label="Back to cart" className="text-primary">
          <Icon name="arrow_back" />
        </Link>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Checkout</h2>
      </div>

      {shopClosed && (
        <div className="flex items-center gap-sm rounded-2xl bg-error-container text-on-error-container px-md py-sm">
          <Icon name="schedule" />
          <p className="font-label-md text-label-md">Ordering is paused right now.</p>
        </div>
      )}

      {/* Customer details */}
      <section className="bg-surface-container-lowest rounded-3xl p-lg shadow-sm space-y-md border border-outline-variant/20">
        <h3 className="font-headline-md text-headline-md text-on-surface">Your Details</h3>
        <Field label="Name" error={errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={inputCls(!!errors.name)}
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field label="WhatsApp number" error={errors.whatsapp} hint="Enter 10-digit mobile number">
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant font-body-md">+91</span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              inputMode="numeric"
              className={inputCls(!!errors.whatsapp)}
              aria-invalid={!!errors.whatsapp}
            />
          </div>
        </Field>
      </section>

      {/* Order summary */}
      <section className="bg-surface-container rounded-3xl p-lg space-y-2">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Order Summary</h3>
        {lines.map((l) => (
          <div key={l.product.id} className="flex justify-between text-on-surface font-body-md">
            <span className="min-w-0 truncate pr-2">
              {l.product.name} <span className="text-on-surface-variant">× {l.quantity}</span>
            </span>
            <span>{formatPrice(l.product.price * l.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-outline-variant/40 pt-2 flex justify-between items-center">
          <span className="font-bold text-on-surface">Total</span>
          <span className="font-bold text-primary text-lg">{formatPrice(subtotal)}</span>
        </div>
      </section>

      {/* Payment */}
      <section className="bg-surface-container-lowest rounded-3xl p-lg shadow-sm space-y-md border border-outline-variant/20">
        <h3 className="font-headline-md text-headline-md text-on-surface">Pay via UPI</h3>

        {!settingsLoaded ? (
          <div className="flex justify-center py-6 text-primary">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Quick pay */}
            {settings?.enable_quick_pay && upiLink && (
              <div className="space-y-1">
                <a
                  href={upiLink}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white flex items-center justify-center gap-2 font-label-md text-label-md shadow-lg active:scale-95 transition"
                >
                  <Icon name="account_balance_wallet" />
                  Pay {formatPrice(subtotal)} via UPI
                </a>
                <p className="text-label-sm text-on-surface-variant text-center">
                  Opens your UPI app with payment details pre-filled.
                </p>
                {desktop && (
                  <p className="text-label-sm text-on-surface-variant text-center">
                    On desktop? Open this page on your phone, or scan the QR below.
                  </p>
                )}
              </div>
            )}

            {/* Order ID */}
            <InfoRow
              label="Order ID (use as payment note)"
              value={orderId}
              valueClass="text-secondary font-mono"
              onCopy={() => copy(orderId, "Order ID")}
            />
            <p className="text-label-sm text-on-surface-variant -mt-2">
              Use this Order ID as the payment note/remark when paying.
            </p>

            {/* UPI ID */}
            <InfoRow
              label="Pay to UPI ID"
              value={settings?.upi_id ?? "—"}
              valueClass="text-primary font-mono"
              onCopy={() => settings && copy(settings.upi_id, "UPI ID")}
            />

            {/* QR */}
            {qrUrl && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-label-sm text-on-surface-variant">Scan QR Code</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="UPI payment QR code"
                  width={180}
                  height={180}
                  className="rounded-xl bg-white p-2 shadow"
                />
              </div>
            )}

            {/* UTR */}
            <Field
              label="UTR / Reference number"
              error={errors.utr}
              hint="12–15 digit reference from your UPI transaction"
            >
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 15))}
                placeholder="e.g. 123456789012"
                inputMode="numeric"
                className={inputCls(!!errors.utr)}
                aria-invalid={!!errors.utr}
              />
            </Field>

            {/* Confirm checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-primary"
              />
              <span className="text-label-md text-on-surface-variant">
                I confirm I&apos;ve completed the payment and all information provided is correct.
              </span>
            </label>
            {errors.confirm && <p className="text-error text-label-sm -mt-2">{errors.confirm}</p>}
          </>
        )}
      </section>

      <button
        onClick={onSubmit}
        disabled={shopClosed || !settingsLoaded}
        className="w-full h-14 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center gap-2 font-label-md text-label-md shadow-xl shadow-primary/20 active:scale-95 transition disabled:opacity-50"
      >
        <Icon name="send" />
        Submit Order
      </button>

      {/* Confirmation modal */}
      <Modal open={showConfirm} onClose={() => !submitting && setShowConfirm(false)} title="Confirm Order Details">
        <div className="space-y-md">
          <div className="bg-surface-container rounded-2xl p-md space-y-1">
            <Row k="Name" v={name} />
            <Row k="WhatsApp" v={`+91 ${whatsapp}`} />
            <Row k="Total" v={formatPrice(subtotal)} vClass="text-primary font-bold" />
          </div>
          <div className="bg-secondary-fixed/40 rounded-2xl p-md">
            <p className="text-label-sm text-on-secondary-fixed">Your Order ID</p>
            <p className="font-mono font-bold text-secondary tracking-wider">{orderId}</p>
            <p className="text-label-sm text-on-secondary-fixed mt-1">
              Save this ID to track your order. I&apos;ll verify your payment on WhatsApp.
            </p>
          </div>
          <div className="flex gap-sm">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
              className="flex-1 h-12 rounded-full bg-surface-container-high text-on-surface font-label-md active:scale-95 transition disabled:opacity-50"
            >
              Go Back
            </button>
            <button
              onClick={confirmSubmit}
              disabled={submitting}
              className="flex-1 h-12 rounded-full bg-primary text-on-primary font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              {submitting ? <Spinner /> : <Icon name="check" />}
              {submitting ? "Submitting..." : "Confirm & Submit"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---- small helpers ----
function inputCls(hasError: boolean) {
  return `w-full h-12 px-4 bg-surface-container rounded-xl border ${
    hasError ? "border-error" : "border-transparent"
  } focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none font-body-md`;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="font-label-md text-label-md text-on-surface">{label}</label>
      {children}
      {error ? (
        <p className="text-error text-label-sm flex items-center gap-1">
          <Icon name="error" className="text-sm" /> {error}
        </p>
      ) : hint ? (
        <p className="text-on-surface-variant text-label-sm">{hint}</p>
      ) : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass,
  onCopy,
}: {
  label: string;
  value: string;
  valueClass?: string;
  onCopy: () => void;
}) {
  return (
    <div className="bg-surface-container rounded-2xl p-md flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-label-sm text-on-surface-variant">{label}</p>
        <p className={`font-bold truncate ${valueClass ?? "text-on-surface"}`}>{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="flex items-center gap-1 text-primary font-label-sm bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition flex-shrink-0"
      >
        <Icon name="content_copy" className="text-sm" />
        Copy
      </button>
    </div>
  );
}

function Row({ k, v, vClass }: { k: string; v: string; vClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-on-surface-variant">{k}</span>
      <span className={vClass ?? "text-on-surface"}>{v}</span>
    </div>
  );
}
