import { clsx } from "clsx";

/**
 * Hanko-style vermillion seal. Hand-authored SVG, deliberately imperfect edges.
 * The signature Patronage motif — used as logo, favicon, and "verified holder" badge.
 */
export function Seal({
  size = 56,
  className,
  label = true,
  variant = "primary",
  accent,
}: {
  size?: number;
  className?: string;
  label?: boolean;
  variant?: "primary" | "outline" | "ink";
  accent?: string;
}) {
  const primary = accent ?? "var(--bags)";
  const fill =
    variant === "primary"
      ? primary
      : variant === "outline"
        ? "transparent"
        : "var(--ink)";
  const stroke = variant === "outline" ? primary : "none";
  const glyph = variant === "outline" ? primary : "var(--bone)";

  return (
    <span
      className={clsx("inline-flex items-center gap-3", className)}
      aria-label="Patronage seal"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Outer seal — hand-drawn feel via slight irregularity on each edge */}
        <path
          d="M4.5 6.2 L58.9 3.8 L60.4 58.1 L6.1 60.6 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={variant === "outline" ? 2 : 0}
        />
        {/* Inner rule (registration border) */}
        <path
          d="M9.6 10.1 L54.7 8.3 L55.8 54.5 L11.2 56.2 Z"
          fill="none"
          stroke={glyph}
          strokeOpacity={0.45}
          strokeWidth={0.7}
        />
        {/* Serif P glyph, centered, optical not mathematical */}
        <path
          d="M24.7 15.3 L24.7 50.2 L30.1 50.2 L30.1 38.8 L36.8 38.8 C42.9 38.8 47.3 34.5 47.3 27.1 C47.3 19.6 42.9 15.3 36.8 15.3 Z M30.1 19.5 L36.2 19.5 C39.9 19.5 41.8 22.1 41.8 27.1 C41.8 32.1 39.9 34.6 36.2 34.6 L30.1 34.6 Z"
          fill={glyph}
        />
        {/* Tiny registration ticks at corners */}
        <path d="M4.5 6.2 L4.5 9.2 M4.5 6.2 L7.5 6.2" stroke={glyph} strokeOpacity={0.55} strokeWidth={0.8} />
        <path d="M60.4 58.1 L60.4 55.1 M60.4 58.1 L57.4 58.1" stroke={glyph} strokeOpacity={0.55} strokeWidth={0.8} />
      </svg>
      {label ? (
        <span className="f-label" style={{ color: "var(--ink)" }}>
          Patronage
        </span>
      ) : null}
    </span>
  );
}
