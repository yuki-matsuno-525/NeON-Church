import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClientLayout } from "./ClientLayout";

// 本文はシステム日本語フォント（globals.css の --font-sans）を使い、Web フォントを読まない。
// 見出しのみブランドの明朝体 Noto Serif JP を Web フォントで読む。
// 日本語フォントは 1 ウェイトあたり多数のサブセット @font-face を生成するため、
// 本文 Web フォントを廃止すると render-blocking CSS とフォントファイル数が大きく減る。
// ウェイトは 400/700 のみ（500 は未読込時 400 にフォールバックする）。
const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-serif",
  preload: false,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neon-church.com";

export const metadata: Metadata = {
  title: {
    default: "NeON Church",
    template: "%s | NeON Church",
  },
  description:
    "Not a church as an institution, but an open field where texts and interpretations intersect. Read, discuss, and translate every text, without ranking one above another.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "NeON Church",
    description:
      "Not a church as an institution, but an open field where texts and interpretations intersect. Read, discuss, and translate every text, without ranking one above another.",
    url: SITE_URL,
    siteName: "NeON Church",
    locale: "en_US",
    alternateLocale: ["ja_JP"],
    type: "website",
    images: [{ url: "/img/logo-og.png", width: 512, height: 512, alt: "NeON Church" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeON Church",
    description: "An open field where texts and interpretations intersect — every text read on equal footing.",
    images: ["/img/logo-og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSerifJp.variable} suppressHydrationWarning>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
