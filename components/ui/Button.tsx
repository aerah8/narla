import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm dark:bg-pink-600 dark:hover:bg-pink-700",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200",
  ghost:
    "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
  danger:
    "bg-red-600 text-white hover:bg-red-700",
  outline:
    "bg-white text-slate-700 border border-slate-300 hover:border-indigo-300 hover:text-indigo-700 dark:hover:border-pink-400 dark:hover:text-pink-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-5 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon: Icon,
  iconPosition = "left",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        Icon && iconPosition === "left" && <Icon className="w-3.5 h-3.5" />
      )}
      {children}
      {!isLoading && Icon && iconPosition === "right" && (
        <Icon className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
