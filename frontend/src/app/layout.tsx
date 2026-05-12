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
  description: "聖書を読み、語り合う場所。節・章へのコメント投稿、Q&A、共同翻訳プロジェクトに参加できます。",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "NeON Church",
    description: "聖書を読み、語り合う場所。節・章へのコメント投稿、Q&A、共同翻訳プロジェクトに参加できます。",
    url: SITE_URL,
    siteName: "NeON Church",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NeON Church",
    description: "聖書を読み、語り合う場所。",
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
