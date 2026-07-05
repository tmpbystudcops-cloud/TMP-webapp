"use client";

import { ProductImage } from "@/components/ui/ProductImage";
import { AddIconButton } from "@/components/cart/CartControls";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

// Compact product card used in grids and the home "Featured" small slots.
export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0 || !product.available;
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-sm bg-surface-container-lowest flex flex-col group">
      <div className="h-32 w-full relative overflow-hidden">
        <div className="w-full h-full group-hover:scale-110 transition-transform duration-500">
          <ProductImage src={product.image_url} alt={product.name} category={product.category} />
        </div>
        {soldOut ? (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-error text-on-error text-[10px] font-bold rounded-full uppercase tracking-wide">
            Sold out
          </span>
        ) : (
          <AddIconButton product={product} className="absolute top-2 right-2" />
        )}
      </div>
      <div className="p-sm flex flex-col flex-grow justify-between gap-1">
        <h5 className="font-label-md text-label-md text-on-surface line-clamp-1">{product.name}</h5>
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-label-sm">{formatPrice(product.price)}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-on-surface-variant line-through text-[11px]">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
