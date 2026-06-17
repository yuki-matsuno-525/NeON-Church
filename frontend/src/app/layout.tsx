import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClientLayout } from "./ClientLayout";

// CSS 変数として注入し、globals.css 側の font-family で利用する。
// セルフホスティングで Google Fonts への外部リクエストを排除し、CLS を抑える。
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
  preload: false,
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
    "Not a church as an institution, but an open field where texts and interpretations intersect. Read, discuss, and translate every text — from canon to Apocrypha and Pseudepigrapha.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "NeON Church",
    description:
      "Not a church as an institution, but an open field where texts and interpretations intersect. Read, discuss, and translate every text — from canon to Apocrypha and Pseudepigrapha.",
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
    description: "An open field where texts and interpretations intersect — from canon to Apocrypha and Pseudepigrapha.",
    images: ["/img/logo-og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} ${notoSerifJp.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
