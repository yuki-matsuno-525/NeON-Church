import type { NextConfig } from "next";
import path from "path";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${API_BASE_URL}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;
