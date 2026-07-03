"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { fetchProducts, invalidateCache } from "@/lib/data";
import { adminInsertProduct, adminUpdateProduct, adminDeleteProduct } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { CATEGORIES, type Category, type Product } from "@/lib/types";

interface FormState {
  id?: number;
  name: string;
  price: string;
  original_price: string;
  stock: string;
  category: Category;
  image_url: string;
  description: string;
  available: boolean;
  featured: boolean;
}

const EMPTY: FormState = {
  name: "",
  price: "",
  original_price: "",
  stock: "",
  category: "other",
  image_url: "",
  description: "",
  available: true,
  featured: false,
};

export function ProductsTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchProducts(true);
      setProducts(p);
      onCountChange(p.length);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [onCountChange, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setForm({ ...EMPTY });
  }
  function startEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      original_price: p.original_price != null ? String(p.original_price) : "",
      stock: String(p.stock),
      category: p.category,
      image_url: p.image_url ?? "",
      description: p.description ?? "",
      available: p.available,
      featured: p.featured,
    });
  }

  async function submit() {
    if (!form) return;
    const payload = {
      id: form.id,
      name: form.name.trim(),
      price: Number(form.price),
      original_price: form.original_price === "" ? null : Number(form.original_price),
      stock: Number(form.stock),
      category: form.category,
      image_url: form.image_url.trim() || null,
      description: form.description.trim() || null,
      available: form.available,
      featured: form.featured,
    };
    if (!payload.name) return toast.error("Name is required");
    if (!Number.isFinite(payload.price) || payload.price <= 0) return toast.error("Enter a valid price");
    if (!Number.isFinite(payload.stock) || payload.stock < 0) return toast.error("Enter valid stock");

    setSaving(true);
    try {
      if (form.id) {
        await adminUpdateProduct(payload);
        toast.success("Product updated");
      } else {
        await adminInsertProduct(payload);
        toast.success("Product added");
      }
      invalidateCache("products");
      setForm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteProduct(deleteTarget.id);
      invalidateCache("products");
      toast.success("Product deleted");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-md text-headline-md text-on-surface">Products</h3>
        <button
          onClick={startAdd}
          className="flex items-center gap-1 bg-primary-container text-on-primary-container px-4 py-2 rounded-full font-label-md active:scale-95 transition"
        >
          <Icon name="add" className="text-base" /> Add
        </button>
      </div>

      {loading ? (
        <div className="space-y-sm">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-on-surface-variant text-center py-6">No products yet. Add your first one!</p>
      ) : (
        <div className="space-y-sm">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/20 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-label-md text-label-md text-on-surface truncate">{p.name}</p>
                  {p.featured && <Icon name="star" className="text-secondary text-sm" fill />}
                </div>
                <div className="flex items-center gap-2 text-label-sm">
                  <span className="text-primary font-bold">{formatPrice(p.price)}</span>
                  <span className={p.stock === 0 ? "text-error" : "text-on-surface-variant"}>
                    Stock: {p.stock}
                  </span>
                  {p.stock >= 1 && p.stock <= 3 && (
                    <span className="bg-warning/20 text-secondary px-2 rounded-full text-[10px] font-bold">LOW</span>
                  )}
                  {!p.available && (
                    <span className="bg-error-container text-on-error-container px-2 rounded-full text-[10px] font-bold">
                      HIDDEN
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(p)}
                  aria-label={`Edit ${p.name}`}
                  className="w-9 h-9 rounded-full bg-info/10 text-info flex items-center justify-center active:scale-90 transition"
                >
                  <Icon name="edit" className="text-base" />
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  aria-label={`Delete ${p.name}`}
                  className="w-9 h-9 rounded-full bg-error/10 text-error flex items-center justify-center active:scale-90 transition"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form modal */}
      <Modal open={!!form} onClose={() => !saving && setForm(null)} title={form?.id ? "Edit Product" : "Add Product"}>
        {form && (
          <div className="space-y-sm">
            <LabeledInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <LabeledInput label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <div className="grid grid-cols-2 gap-sm">
              <LabeledInput label="Price (₹)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
              <LabeledInput
                label="Was (₹, optional)"
                value={form.original_price}
                onChange={(v) => setForm({ ...form, original_price: v })}
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <LabeledInput label="Stock" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} type="number" />
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                  className="w-full h-12 px-3 bg-surface-container rounded-xl border border-transparent focus:border-primary outline-none capitalize"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <LabeledInput label="Image URL (optional)" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
            <div className="flex gap-lg pt-1">
              <Check label="Available" checked={form.available} onChange={(v) => setForm({ ...form, available: v })} />
              <Check label="Featured" checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
            </div>
            <div className="flex gap-sm pt-2">
              <button
                onClick={() => setForm(null)}
                disabled={saving}
                className="flex-1 h-12 rounded-full bg-surface-container-high text-on-surface font-label-md active:scale-95 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex-1 h-12 rounded-full bg-primary text-on-primary font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
              >
                {saving ? <Spinner className="w-4 h-4" /> : <Icon name="check" />}
                {form.id ? "Update" : "Add"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Delete Product">
        <p className="text-on-surface-variant mb-md">
          Delete <span className="font-bold text-on-surface">{deleteTarget?.name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-sm">
          <button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            className="flex-1 h-12 rounded-full bg-surface-container-high text-on-surface font-label-md active:scale-95 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 h-12 rounded-full bg-error text-on-error font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
          >
            {deleting ? <Spinner className="w-4 h-4" /> : <Icon name="delete" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="font-label-md text-label-md text-on-surface">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
      />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded accent-primary" />
      <span className="text-label-md text-on-surface">{label}</span>
    </label>
  );
}
