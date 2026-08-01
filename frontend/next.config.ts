import type { NextConfig } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const isDev = process.env.NODE_ENV === "development";

// CSP の connect-src には開発用の localhost、本番用 API、Sentry を許可する。
// img-src は OGP プレビュー等の都合で https: を広めに許可している。
// unsafe-eval は React 開発モードのスタックトレース再構築に必要なため開発時のみ許可する。
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' ${API_BASE_URL} https://*.sentry.io https://*.ingest.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  experimental: {
    // @/components/ui のような「まとめ口」から1つだけ読み込んでも、
    // 実際には中身が全部ついてくる。使ったものだけを読むようにする。
    optimizePackageImports: ["@/components/ui"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        // 画像やアイコンは中身が変わらない（変えるときはファイル名を変える）。
        // 毎回取り直さず、ブラウザに1年持たせる。
        source: "/img/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
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
