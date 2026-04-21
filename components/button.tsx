"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

type Variant = "ink" | "vermillion" | "ghost" | "outline";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

/**
 * Editorial button. Small caps labels, rule underline on hover, no rounded pill.
 * Uses the authored easing from design tokens.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ink", size = "md", className, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 f-label transition-[background,color,transform] duration-[220ms] [transition-timing-function:var(--ease-snap)] active:translate-y-[1px] select-none";
    const sizing =
      size === "sm"
        ? "h-8 px-3 text-[10px]"
        : size === "lg"
          ? "h-14 px-8 text-[12px]"
          : "h-11 px-5 text-[11px]";
    const variants: Record<Variant, string> = {
      ink: "bg-ink text-bone hover:bg-ink-soft",
      vermillion: "bg-vermillion text-bone hover:bg-vermillion-dim",
      ghost:
        "bg-transparent text-ink hover:bg-bone-warm",
      outline:
        "bg-transparent text-ink border border-ink hover:bg-ink hover:text-bone",
    };
    return (
      <button
        ref={ref}
        className={clsx(base, sizing, variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
