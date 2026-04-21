import { clsx } from "clsx";

/**
 * Big editorial numerals used as ornament — like the issue numbers
 * at the top of a magazine page.
 */
export function Folio({
  n,
  className,
  color = "ochre",
}: {
  n: number | string;
  className?: string;
  color?: "ochre" | "vermillion" | "ink" | "rule";
}) {
  const c =
    color === "ochre"
      ? "var(--ochre)"
      : color === "vermillion"
        ? "var(--vermillion)"
        : color === "ink"
          ? "var(--ink)"
          : "var(--rule)";
  return (
    <span
      aria-hidden
      className={clsx("f-folio select-none pointer-events-none block", className)}
      style={{ color: c }}
    >
      {typeof n === "number" ? n.toString().padStart(2, "0") : n}
    </span>
  );
}
