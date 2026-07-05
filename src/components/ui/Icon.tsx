import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  className?: string;
  fill?: boolean;
  // decorative icons should be hidden from screen readers
  label?: string;
  style?: React.CSSProperties;
}

// Thin wrapper around Google's Material Symbols icon font (matches the Figma design).
export function Icon({ name, className, fill, label, style }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined", fill && "fill", className)}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
