"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/utils";

// The animated "View Cart" bar from the design. Hidden on the cart/checkout pages.
export function FloatingCartBar() {
  const pathname = usePathname();
  const { count, subtotal, hydrated } = useCart();

  const hiddenOn = pathname.startsWith("/cart") || pathname.startsWith("/checkout");
  if (!hydrated || count === 0 || hiddenOn) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-40">
      <Link
        href="/cart"
        className="w-full h-14 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-between px-lg shadow-xl shadow-primary/20 active:scale-95 transition-all animate-bounce-subtle"
      >
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded-lg bg-on-primary-container/20 flex items-center justify-center">
            <span className="font-bold text-label-md">{count}</span>
          </div>
          <span className="font-label-md text-label-md">View Cart</span>
        </div>
        <span className="font-bold text-lg">{formatPrice(subtotal)}</span>
      </Link>
    </div>
  );
}
