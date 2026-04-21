import { clsx } from "clsx";

export function Container({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const maxW =
    size === "narrow"
      ? "max-w-[780px]"
      : size === "wide"
        ? "max-w-[1400px]"
        : "max-w-[1180px]";
  return (
    <div className={clsx("mx-auto px-6 sm:px-10 lg:px-16", maxW, className)}>
      {children}
    </div>
  );
}
