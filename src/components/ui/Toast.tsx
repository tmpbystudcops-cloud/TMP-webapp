"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++counter;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 3000);
    },
    [remove]
  );

  // Stable identity so consumers depending on the toast object in effect deps
  // (e.g. the admin realtime subscription) don't resubscribe on every render.
  const value: ToastContextValue = useMemo(
    () => ({
      toast,
      success: (m: string) => toast(m, "success"),
      error: (m: string) => toast(m, "error"),
      info: (m: string) => toast(m, "info"),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-md space-y-sm"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const STYLES: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "bg-primary text-on-primary", icon: "check_circle" },
  error: { bg: "bg-error text-on-error", icon: "error" },
  info: { bg: "bg-inverse-surface text-inverse-on-surface", icon: "info" },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const s = STYLES[item.type];
  return (
    <div
      className={cn(
        "flex items-center gap-sm rounded-xl px-md py-sm shadow-lg animate-slide-in-right",
        s.bg
      )}
    >
      <Icon name={s.icon} className="text-xl" fill />
      <span className="flex-grow font-label-md text-label-md">{item.message}</span>
      <button onClick={onClose} aria-label="Dismiss notification" className="opacity-80 hover:opacity-100">
        <Icon name="close" className="text-lg" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
