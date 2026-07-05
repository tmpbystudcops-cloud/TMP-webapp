"use client";

import { useFocusTrap } from "@/lib/useFocusTrap";
import { Icon } from "./Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  hideClose?: boolean;
}

export function Modal({ open, onClose, title, children, hideClose }: ModalProps) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[90] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
          {!hideClose && (
            <button onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-on-surface">
              <Icon name="close" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
