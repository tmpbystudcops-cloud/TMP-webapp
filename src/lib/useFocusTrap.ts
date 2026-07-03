"use client";

import { useEffect, useRef } from "react";

// Traps focus within a container while `active`, and restores focus on close.
// Also calls onEscape when Escape is pressed.
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null)
        : [];

    // move focus into the modal
    const focusables = getFocusable();
    (focusables[0] ?? container)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, onEscape]);

  return ref;
}
