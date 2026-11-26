import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // script Roblox dibaca dari folder roblox/ saat halaman map dirender (tombol "Salin script")
  outputFileTracingIncludes: {
    "/dashboard/*": ["./roblox/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
