import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // trailing slash付きのURLは末尾スラッシュを保持してプロキシ
      {
        source: "/api/:path*/",
        destination: "http://localhost:8000/api/:path*/",
      },
      // trailing slashなしのURLも末尾スラッシュをつけてDjangoへ転送
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*/",
      },
    ];
  },
};

export default nextConfig;
