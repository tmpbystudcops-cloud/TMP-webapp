import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP: Record<OrderStatus, { cls: string; icon: string; message: string }> = {
  Pending: {
    cls: "bg-secondary-container text-on-secondary-container",
    icon: "hourglass_top",
    message: "Your order is being prepared.",
  },
  Ready: {
    cls: "bg-info/15 text-info",
    icon: "notifications_active",
    message: "Your order is ready for pickup!",
  },
  "Picked Up": {
    cls: "bg-success/15 text-success",
    icon: "task_alt",
    message: "Order completed. Thank you!",
  },
};

export function statusMessage(status: OrderStatus): string {
  return MAP[status].message;
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-sm text-label-sm",
        s.cls,
        className
      )}
    >
      <span className="material-symbols-outlined text-sm" aria-hidden>
        {s.icon}
      </span>
      {status}
    </span>
  );
}
