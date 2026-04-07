import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: "sm" | "md";
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600",
  primary: "bg-indigo-100 text-indigo-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  outline: "bg-white text-slate-600 border border-slate-200",
};

export function Badge({
  children,
  variant = "default",
  className,
  size = "md",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
