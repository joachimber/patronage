import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    // Empty config silences the Next 16 Turbopack/webpack coexistence warning.
  },
};

export default nextConfig;
