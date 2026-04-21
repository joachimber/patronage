/**
 * Print-shop registration-cross ornaments used as page corner ticks.
 * Purely decorative — evokes 1970s print-shop alignment marks.
 */
export function RegistrationMark({
  size = 12,
  className,
  tone = "rule",
}: {
  size?: number;
  className?: string;
  tone?: "rule" | "vermillion" | "ink";
}) {
  const stroke =
    tone === "vermillion"
      ? "var(--vermillion)"
      : tone === "ink"
        ? "var(--ink)"
        : "var(--rule)";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="8" cy="8" r="5" stroke={stroke} strokeWidth={0.8} />
      <line x1="0" y1="8" x2="16" y2="8" stroke={stroke} strokeWidth={0.8} />
      <line x1="8" y1="0" x2="8" y2="16" stroke={stroke} strokeWidth={0.8} />
    </svg>
  );
}

/**
 * Tier-ladder ornament — geometric figure referencing Japanese
 * print marks. Ascending horizontal bars form a pictogram of rising tiers.
 */
export function TierLadder({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <rect x="4" y="48" width="56" height="8" fill="var(--ink)" />
      <rect x="14" y="32" width="36" height="8" fill="var(--ink)" />
      <rect x="22" y="16" width="20" height="8" fill="var(--vermillion)" />
      <rect x="28" y="4" width="8" height="8" fill="var(--ink)" />
    </svg>
  );
}
