"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { AddToCartButton, AddIconButton } from "@/components/cart/CartControls";
import { BentoSkeleton, ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { isSupabaseConfiguredBrowser } from "@/lib/supabase/client";
import { fetchAvailableProducts, fetchSettings } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { CATEGORIES, type Category, type Product, type PublicSettings } from "@/lib/types";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const configured = isSupabaseConfiguredBrowser();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [prods, sett] = await Promise.all([fetchAvailableProducts(), fetchSettings()]);
        if (!alive) return;
        setProducts(prods);
        setSettings(sett);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [configured]);

  const featured = useMemo(() => products.filter((p) => p.featured), [products]);
  const deals = useMemo(
    () => products.filter((p) => p.original_price && p.original_price > p.price),
    [products]
  );
  const brainFood = useMemo(() => products.filter((p) => p.category === "healthy"), [products]);

  const filtering = query.trim().length > 0 || activeCategory !== null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
      const matchesCat = !activeCategory || p.category === activeCategory;
      return matchesQ && matchesCat;
    });
  }, [products, query, activeCategory]);

  return (
    <div className="space-y-xl pb-4">
      {/* Welcome + Search */}
      <section className="space-y-md">
        <div>
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
            Hungry for a snack, <span className="text-primary-container">Wildcat?</span>
          </h2>
          <p className="text-on-surface-variant font-body-md">
            {settings?.tagline ?? "Get your favorites delivered in minutes."}
          </p>
        </div>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-10 bg-surface-container border-none rounded-full focus:ring-2 focus:ring-primary-container font-body-md transition-all shadow-sm outline-none"
            placeholder="Search for snacks, drinks..."
            type="text"
            aria-label="Search products"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </section>

      {/* Preview mode banner (Supabase not wired yet) */}
      {!configured && (
        <div className="flex items-center gap-sm rounded-2xl bg-secondary-fixed/40 text-on-secondary-fixed px-md py-sm">
          <span className="material-symbols-outlined text-secondary">visibility</span>
          <p className="font-label-sm text-label-sm">
            Preview mode — showing sample data. Connect Supabase to go live.
          </p>
        </div>
      )}

      {/* Shop closed banner */}
      {settings && !settings.orders_enabled && (
        <div className="flex items-center gap-sm rounded-2xl bg-error-container text-on-error-container px-md py-sm">
          <Icon name="schedule" />
          <p className="font-label-md text-label-md">
            Ordering is paused right now — check back soon!
          </p>
        </div>
      )}

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-sm">
          <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Categories</h3>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="text-primary font-label-sm text-label-sm"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-gutter overflow-x-auto no-scrollbar py-2 -mx-container-margin px-container-margin">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(active ? null : cat.key)}
                className="flex flex-col items-center gap-sm flex-shrink-0 group"
                aria-pressed={active}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-transform ${
                    active
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <Icon name={cat.icon} className="text-3xl" fill={cat.key === "hot"} />
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="space-y-md">
          <BentoSkeleton />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <EmptyState
          icon="error"
          title="Couldn't load snacks"
          message={error}
        />
      )}

      {/* Filtered results */}
      {!loading && !error && filtering && (
        <section className="space-y-md">
          <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </h3>
          {filtered.length === 0 ? (
            <EmptyState icon="search_off" title="No matches" message="Try a different search or category." />
          ) : (
            <div className="grid grid-cols-2 gap-md">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Curated home content */}
      {!loading && !error && !filtering && (
        <>
          {products.length === 0 && (
            <EmptyState
              icon="inventory_2"
              title="No items yet"
              message="Check back soon — snacks are on the way!"
            />
          )}

          {/* Featured bento */}
          {featured.length > 0 && (
            <section className="space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  Featured Cravings
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <FeaturedCard product={featured[0]} />
                {featured.slice(1, 3).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Deals */}
          {deals.length > 0 && (
            <section className="space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  Late Night Deals
                </h3>
              </div>
              {deals.slice(0, 3).map((p) => (
                <DealCard key={p.id} product={p} />
              ))}
            </section>
          )}

          {/* Brain food */}
          {brainFood.length > 0 && (
            <section>
              <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-md">
                Brain Food
              </h3>
              <div className="flex gap-md overflow-x-auto no-scrollbar -mx-container-margin px-container-margin">
                {brainFood.map((p) => (
                  <BrainFoodCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ---- Large featured card ----
function FeaturedCard({ product }: { product: Product }) {
  return (
    <div className="col-span-2 relative rounded-3xl overflow-hidden shadow-lg h-56 group">
      <div className="absolute inset-0 group-hover:scale-110 transition-transform duration-700">
        <ProductImage src={product.image_url} alt={product.name} category={product.category} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-lg">
        <span className="inline-block px-sm py-1 bg-primary-container text-white text-[10px] font-bold rounded-full mb-xs w-max uppercase tracking-widest">
          Campus Favorite
        </span>
        <h4 className="text-white font-headline-md text-headline-md leading-tight">{product.name}</h4>
        <div className="flex justify-between items-center mt-sm">
          <span className="text-secondary-fixed font-bold text-lg">{formatPrice(product.price)}</span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}

// ---- Horizontal deal card ----
function DealCard({ product }: { product: Product }) {
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-md flex items-center gap-md border border-outline-variant/30 shadow-sm">
      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
        <ProductImage src={product.image_url} alt={product.name} category={product.category} />
      </div>
      <div className="flex-grow min-w-0">
        <h4 className="font-headline-md text-headline-md text-on-surface leading-tight line-clamp-1">
          {product.name}
        </h4>
        {product.description && (
          <p className="text-on-surface-variant text-label-sm font-label-sm line-clamp-1">
            {product.description}
          </p>
        )}
        <div className="mt-sm flex items-center gap-sm">
          <span className="text-primary font-bold text-lg">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-on-surface-variant line-through text-xs">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <AddIconButton product={product} className="shadow" />
      </div>
    </div>
  );
}

// ---- Brain food (healthy) card ----
function BrainFoodCard({ product }: { product: Product }) {
  return (
    <div className="w-40 flex-shrink-0 space-y-sm group">
      <div className="w-40 h-40 rounded-3xl overflow-hidden bg-surface-container shadow-sm border border-outline-variant/20 relative">
        <div className="w-full h-full group-hover:scale-105 transition-transform duration-500">
          <ProductImage src={product.image_url} alt={product.name} category={product.category} />
        </div>
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-full px-2 py-1 text-primary font-bold text-xs shadow-sm">
          {formatPrice(product.price)}
        </div>
        <AddIconButton product={product} className="absolute top-2 right-2" />
      </div>
      <p className="font-label-md text-label-md text-on-surface line-clamp-1">{product.name}</p>
    </div>
  );
}
