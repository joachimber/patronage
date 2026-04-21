import { clsx } from "clsx";

export function Rule({
  orientation = "h",
  weight = "hairline",
  className,
}: {
  orientation?: "h" | "v";
  weight?: "hairline" | "thick" | "dotted";
  className?: string;
}) {
  const base =
    orientation === "h"
      ? weight === "dotted"
        ? "w-full h-[6px] dot-rule"
        : weight === "thick"
          ? "w-full rule-thick"
          : "w-full rule-h"
      : weight === "dotted"
        ? "h-full w-[6px] dot-rule"
        : weight === "thick"
          ? "h-full w-[2px] bg-ink"
          : "h-full rule-v";
  return <div role="presentation" className={clsx(base, className)} />;
}
