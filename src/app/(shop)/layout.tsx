import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FloatingCartBar } from "@/components/layout/FloatingCartBar";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar />
      <main className="max-w-md mx-auto px-container-margin pt-md">{children}</main>
      <FloatingCartBar />
      <BottomNav />
    </div>
  );
}
