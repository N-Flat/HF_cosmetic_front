import type { NextConfig } from "next";
const demo = process.env.STATIC_DEMO === "true";
const apiBase = (
  process.env.AI_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
if (!/^https?:\/\//.test(apiBase))
  throw new Error("AI_API_BASE_URL must use http:// or https://");
const nextConfig: NextConfig = {
  ...(demo
    ? { output: "export" as const, trailingSlash: true }
    : {
        async rewrites() {
          return [{ source: "/ai/:path*", destination: `${apiBase}/:path*` }];
        },
      }),
  env: { NEXT_PUBLIC_STATIC_DEMO: String(demo) },
  images: { unoptimized: true },
};
export default nextConfig;
