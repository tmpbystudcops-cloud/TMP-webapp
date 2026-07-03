"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartLine, Product } from "@/lib/types";
import { LS_CART } from "@/lib/constants";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  getQty: (productId: number) => number;
  /** returns false if blocked by stock */
  add: (product: Product, delta?: number) => boolean;
  setQty: (product: Product, qty: number) => boolean;
  removeLine: (productId: number) => void;
  clear: () => void;
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  // hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CART);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l?.product && l.quantity > 0));
      }
    } catch {
      /* ignore corrupt cart */
    }
    loaded.current = true;
    setHydrated(true);
  }, []);

  // persist on change (after initial load)
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(LS_CART, JSON.stringify(lines));
    } catch {
      /* ignore quota errors */
    }
  }, [lines]);

  const getQty = useCallback(
    (productId: number) => lines.find((l) => l.product.id === productId)?.quantity ?? 0,
    [lines]
  );

  const setQty = useCallback((product: Product, qty: number): boolean => {
    const clamped = Math.max(0, Math.min(qty, product.stock));
    let ok = clamped === qty; // false when we had to clamp against stock
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (clamped <= 0) return prev.filter((l) => l.product.id !== product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { product, quantity: clamped } : l
        );
      }
      return [...prev, { product, quantity: clamped }];
    });
    if (product.stock <= 0) ok = false;
    return ok;
  }, []);

  const add = useCallback(
    (product: Product, delta = 1): boolean => {
      // Overflow check for the caller's toast (closure read is fine for real,
      // one-per-render taps). The actual mutation composes from `prev` below so
      // it stays correct even if two updates are ever batched together.
      const current = lines.find((l) => l.product.id === product.id)?.quantity ?? 0;
      const overflow = delta > 0 && current + delta > product.stock;

      setLines((prev) => {
        const cur = prev.find((l) => l.product.id === product.id)?.quantity ?? 0;
        const clamped = Math.max(0, Math.min(cur + delta, product.stock));
        if (clamped <= 0) return prev.filter((l) => l.product.id !== product.id);
        if (prev.some((l) => l.product.id === product.id)) {
          return prev.map((l) => (l.product.id === product.id ? { product, quantity: clamped } : l));
        }
        return [...prev, { product, quantity: clamped }];
      });

      return !overflow && product.stock > 0;
    },
    [lines]
  );

  const removeLine = useCallback((productId: number) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);
  const subtotal = useMemo(
    () => Math.round(lines.reduce((s, l) => s + l.product.price * l.quantity, 0) * 100) / 100,
    [lines]
  );

  const value: CartContextValue = {
    lines,
    count,
    subtotal,
    getQty,
    add,
    setQty,
    removeLine,
    clear,
    hydrated,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
