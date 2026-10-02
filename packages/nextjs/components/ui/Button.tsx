"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "default" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-fg rounded-sm",
  secondary:
    "bg-raised text-fg rounded-sm hairline hairline-hover hover:bg-surface",
  ghost:
    "text-muted hover:text-fg hover:bg-raised rounded-sm",
  danger:
    "bg-danger/15 text-danger hover:bg-danger/25 rounded-sm",
};

const sizeClasses: Record<Size, string> = {
  sm:      "h-9 min-h-9 px-3 text-xs",
  default: "h-11 min-h-11 px-4",
  lg:      "h-12 min-h-12 px-5",
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium " +
  "transition-[color,background-color,box-shadow,transform,opacity] duration-150 " +
  "ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.98]";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "default", className = "", children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={[base, variantClasses[variant], sizeClasses[size], className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
