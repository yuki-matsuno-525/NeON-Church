import type { Metadata } from "next";
import "@fontsource-variable/noto-serif-jp/wght.css";
import "./globals.css";
import { Providers } from "./providers";
import { ClientLayout } from "./ClientLayout";
import { Footer } from "@/components/layout/Footer";
import { siteCopy } from "@/lib/siteCopy";
import { getRequestLanguage } from "@/lib/serverLanguage";

// 本文はシステム日本語フォント（globals.css の --font-sans）を使い、見出しだけ
// Noto Serif JP を読む。Fontsource の固定版を自己ホストし、build が Google Fonts の
// 可用性や配信内容に依存しないようにする。

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
    <html lang={lang} suppressHydrationWarning>
      <body>
        <Providers initialLang={lang}>
          <ClientLayout footer={<Footer />}>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
