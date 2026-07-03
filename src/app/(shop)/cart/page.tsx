"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { QuantityStepper } from "@/components/cart/CartControls";
import { ProductImage } from "@/components/ui/ProductImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { lines, subtotal, count, removeLine, clear, hydrated } = useCart();
  const router = useRouter();

  return (
    <div className="space-y-lg pb-8">
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Your Cart</h2>
        {hydrated && count > 0 && (
          <button onClick={clear} className="text-error font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="delete" className="text-base" />
            Clear
          </button>
        )}
      </div>

      {!hydrated ? null : lines.length === 0 ? (
        <EmptyState icon="shopping_cart" title="Your cart is empty" message="Add some snacks to get started.">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-lg py-3 rounded-full font-label-md shadow active:scale-95 transition"
          >
            <Icon name="storefront" />
            Browse snacks
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="space-y-md">
            {lines.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="bg-surface-container-lowest rounded-3xl p-sm flex items-center gap-md shadow-sm border border-outline-variant/20"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                  <ProductImage src={product.image_url} alt={product.name} category={product.category} />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-label-md text-label-md text-on-surface line-clamp-1">{product.name}</h3>
                  <p className="text-primary font-bold text-label-sm">{formatPrice(product.price)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper product={product} />
                    <span className="font-bold text-on-surface">
                      {formatPrice(product.price * quantity)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeLine(product.id)}
                  aria-label={`Remove ${product.name} from cart`}
                  className="self-start text-on-surface-variant hover:text-error transition"
                >
                  <Icon name="close" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-surface-container rounded-3xl p-md space-y-2">
            <div className="flex justify-between text-on-surface-variant font-body-md">
              <span>Items ({count})</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="border-t border-outline-variant/40 pt-2 flex justify-between items-center">
              <span className="font-headline-md text-headline-md text-on-surface">Total</span>
              <span className="font-headline-md text-headline-md text-primary">{formatPrice(subtotal)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/checkout")}
            className="w-full h-14 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center gap-sm font-label-md text-label-md shadow-xl shadow-primary/20 active:scale-95 transition"
          >
            <Icon name="lock" className="text-lg" />
            Proceed to Checkout · {formatPrice(subtotal)}
          </button>
        </>
      )}
    </div>
  );
}
