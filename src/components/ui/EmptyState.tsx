import { Icon } from "./Icon";

interface Props {
  icon: string;
  title: string;
  message?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon, title, message, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-xl px-md">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-md">
        <Icon name={icon} className="text-3xl text-on-surface-variant" />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
      {message && <p className="text-on-surface-variant font-body-md mt-1 max-w-xs">{message}</p>}
      {children && <div className="mt-md">{children}</div>}
    </div>
  );
}
