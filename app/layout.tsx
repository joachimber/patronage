import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Patronage — a creator toolkit for Bags tokens",
  description:
    "Package gated content, file downloads, and community perks into tiers. Holders unlock by holding your token — onchain-verified, no subscriptions.",
  openGraph: {
    title: "Patronage",
    description: "A creator toolkit for Bags tokens.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${jetbrains.variable}`}
      style={{
        ["--font-sans" as string]: `var(--font-jakarta), ui-sans-serif, system-ui, sans-serif`,
        ["--font-display" as string]: `var(--font-jakarta), ui-sans-serif, system-ui, sans-serif`,
        ["--font-mono" as string]: `var(--font-jetbrains), ui-monospace, Menlo, monospace`,
      }}
    >
      <body className="min-h-screen bg-bone text-ink">{children}</body>
    </html>
  );
}
