"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: "home", match: (p: string) => p === "/" },
  { href: "/orders", label: "Orders", icon: "receipt_long", match: (p: string) => p.startsWith("/orders") },
  { href: "/cart", label: "Cart", icon: "shopping_cart", match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout") },
  { href: "/profile", label: "Profile", icon: "person", match: (p: string) => p.startsWith("/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        const showBadge = item.label === "Cart" && hydrated && count > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all",
              active
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            <Icon name={item.icon} fill={active} />
            <span className="font-label-sm text-label-sm">{item.label}</span>
            {showBadge && (
              <span className="absolute -top-0.5 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
