"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { APP_NAME } from "@/lib/constants";

export function TopBar() {
  return (
    <header className="flex justify-between items-center px-container-margin py-sm w-full sticky top-0 z-40 bg-surface shadow-sm">
      <Link href="/" className="flex items-center gap-sm">
        <span className="material-symbols-outlined text-primary">storefront</span>
        <h1 className="font-headline-md text-headline-md font-bold text-primary">{APP_NAME}</h1>
      </Link>
      <Link
        href="/profile"
        aria-label="Your profile"
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed shadow-sm bg-primary-container/10 flex items-center justify-center"
      >
        <Icon name="person" className="text-primary text-2xl" fill />
      </Link>
    </header>
  );
}
