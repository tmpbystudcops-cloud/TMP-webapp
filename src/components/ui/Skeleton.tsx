import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-surface-container-high rounded-lg", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-surface-container-low shadow-sm">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-sm space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function BentoSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-md">
      <Skeleton className="col-span-2 h-56 rounded-3xl" />
      <Skeleton className="h-48 rounded-3xl" />
      <Skeleton className="h-48 rounded-3xl" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-md shadow-sm space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function TableRowSkeleton() {
  return <Skeleton className="h-12 w-full" />;
}
