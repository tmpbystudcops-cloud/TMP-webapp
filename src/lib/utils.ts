import { CURRENCY } from "./constants";

// Format a number as an INR price string, e.g. 6.5 -> "₹6.50"
export function formatPrice(value: number): string {
  return `${CURRENCY}${value.toFixed(2)}`;
}

// Generate a unique order id: NU{DDMM}{4-char random}, e.g. NU2612A3B7
export function generateOrderId(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `NU${dd}${mm}${rand}`;
}

// Build a UPI deep link
export function buildUpiLink(upiId: string, amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: "TMP at NU",
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

// Build a QR-code image URL for a UPI link
export function buildQrUrl(upiLink: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    upiLink
  )}`;
}

// Indian mobile validation: 10 digits starting 6-9
export function isValidWhatsApp(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.trim());
}

// UTR: 12-15 digits
export function isValidUtr(value: string): boolean {
  return /^\d{12,15}$/.test(value.trim());
}

// wa.me link for +91 numbers
export function waLink(whatsapp: string, text?: string): string {
  const base = `https://wa.me/91${whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// Detect desktop (no touch) for UPI fallback hint
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !("ontouchstart" in window) && !navigator.maxTouchPoints;
}

// Format a timestamp for display
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Simple clipboard helper with graceful fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
