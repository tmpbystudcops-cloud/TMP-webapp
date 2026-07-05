import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

function categoryIcon(category: Category): string {
  return CATEGORIES.find((c) => c.key === category)?.icon ?? "fastfood";
}

interface Props {
  src: string | null;
  alt: string;
  category: Category;
  className?: string;
  imgClassName?: string;
}

// Renders a product photo, or a themed gradient + category icon when no image is set.
// Uses a plain <img> so admins can paste arbitrary image URLs without domain config.
export function ProductImage({ src, alt, category, className, imgClassName }: Props) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("w-full h-full object-cover", imgClassName)}
      />
    );
  }
  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-fixed via-secondary-fixed to-secondary-container",
        className
      )}
    >
      <Icon name={categoryIcon(category)} className="text-4xl text-on-primary-container/70" fill />
    </div>
  );
}
