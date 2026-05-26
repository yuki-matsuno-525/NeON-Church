import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ClientLayout } from "./ClientLayout";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neon-church.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "NeON Church",
    template: "%s | NeON Church",
  },
  description:
    "Read and discuss the Bible, Apocrypha, and Pseudepigrapha. Post comments on verses and chapters, ask questions, and join collaborative translation projects. 聖書・外典・偽典を読み、語り合うプラットフォーム。",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "NeON Church",
    description:
      "Read and discuss the Bible, Apocrypha, and Pseudepigrapha. Post comments on verses and chapters, ask questions, and join collaborative translation projects.",
    url: SITE_URL,
    siteName: "NeON Church",
    locale: "en_US",
    alternateLocale: ["ja_JP"],
    type: "website",
    images: [{ url: "/img/logo.png", width: 512, height: 512, alt: "NeON Church" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeON Church",
    description: "Read and discuss the Bible, Apocrypha, and Pseudepigrapha.",
    images: ["/img/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
