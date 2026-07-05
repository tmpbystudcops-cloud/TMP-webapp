"use client";

import { useCart } from "./CartProvider";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

function useAddWithStockGuard() {
  const { add } = useCart();
  const toast = useToast();
  return (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    const ok = add(product, 1);
    if (!ok) toast.error(`Only ${product.stock} × ${product.name} available`);
  };
}

// Small round "+" button (used on compact product cards)
export function AddIconButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const addOne = useAddWithStockGuard();
  const disabled = product.stock <= 0 || !product.available;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        addOne(product);
      }}
      disabled={disabled}
      aria-label={`Add ${product.name} to cart`}
      className={cn(
        "w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-primary shadow-md active:scale-90 transition-all disabled:opacity-40 disabled:active:scale-100",
        className
      )}
    >
      <Icon name="add" className="text-lg" />
    </button>
  );
}

// Pill "Add to Cart" button (used on the large featured card)
export function AddToCartButton({ product }: { product: Product }) {
  const addOne = useAddWithStockGuard();
  const { getQty } = useCart();
  const qty = getQty(product.id);
  const disabled = product.stock <= 0 || !product.available;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        addOne(product);
      }}
      disabled={disabled}
      className="bg-primary-container text-on-primary-container px-lg py-2 rounded-full font-label-md shadow-lg active:scale-95 transition-all disabled:opacity-50"
    >
      {disabled ? "Sold out" : qty > 0 ? `Added (${qty})` : "Add to Cart"}
    </button>
  );
}

// Full [-] qty [+] stepper (used on the cart page)
export function QuantityStepper({ product }: { product: Product }) {
  const { getQty, add } = useCart();
  const toast = useToast();
  const qty = getQty(product.id);

  const inc = () => {
    const ok = add(product, 1);
    if (!ok) toast.error(`Only ${product.stock} × ${product.name} available`);
  };
  const dec = () => add(product, -1);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={dec}
        aria-label={`Remove one ${product.name}`}
        className="w-8 h-8 rounded-full bg-surface-container-high text-error flex items-center justify-center active:scale-90 transition"
      >
        <Icon name="remove" className="text-lg" />
      </button>
      <span aria-live="polite" className="min-w-[24px] text-center font-bold text-on-surface">
        {qty}
      </span>
      <button
        onClick={inc}
        aria-label={`Add one ${product.name}`}
        disabled={qty >= product.stock}
        className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center active:scale-90 transition disabled:opacity-40"
      >
        <Icon name="add" className="text-lg" />
      </button>
    </div>
  );
}
