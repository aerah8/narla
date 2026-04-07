import { type LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-800 text-lg mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
