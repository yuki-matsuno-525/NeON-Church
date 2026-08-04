import type { Metadata } from "next";
import { getBookBySlug } from "@/lib/books";
import { getRequestLanguage } from "@/lib/serverLanguage";

type Props = { params: Promise<{ book: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug } = await params;
  const meta = getBookBySlug(slug);
  if (!meta) return {};
  const lang = await getRequestLanguage();
  const title = lang === "en" ? meta.englishName : meta.name;
  const description = lang === "en"
    ? `Chapter list and comments for ${meta.englishName}. Read, discuss, and share.`
    : `${meta.name}の章一覧とコメント。本文を読み、議論し、共有できます。`;
  return {
    // 題は「マタイによる福音書」。この下の章のページにもサイト名が付くよう、
    // template を書き直しておく（文字列だけにすると章の題からサイト名が消える）。
    title: { default: title, template: "%s | NeON Church" },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/img/logo-og.png", width: 512, height: 512, alt: "NeON Church" }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/img/logo-og.png"],
    },
  };
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
