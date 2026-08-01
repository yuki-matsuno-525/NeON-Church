import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClientLayout } from "./ClientLayout";
import { siteCopy } from "@/lib/siteCopy";
import { getRequestLanguage } from "@/lib/serverLanguage";

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

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLanguage();
  const copy = siteCopy[lang];
  return {
    title: { default: "NeON Church", template: "%s | NeON Church" },
    description: copy.description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: "NeON Church",
      description: copy.description,
      url: SITE_URL,
      siteName: "NeON Church",
      locale: lang === "en" ? "en_US" : "ja_JP",
      alternateLocale: [lang === "en" ? "ja_JP" : "en_US"],
      type: "website",
      images: [{ url: "/img/logo-og.png", width: 512, height: 512, alt: "NeON Church" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NeON Church",
      description: copy.socialDescription,
      images: ["/img/logo-og.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getRequestLanguage();
  return (
    <html lang={lang} className={notoSerifJp.variable} suppressHydrationWarning>
      <body>
        <Providers initialLang={lang}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
