import type { Metadata } from "next";
import { getBookBySlug } from "@/lib/books";

type Props = { params: Promise<{ book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter } = await params;
  const meta = getBookBySlug(slug);
  const chapterNum = Number(chapter);
  if (!meta || !chapterNum) return {};
  return {
    title: `${meta.short} 第${chapterNum}章`,
    description: `${meta.name} ${chapterNum}章を読む。節・章へのコメントが投稿できます。`,
    openGraph: {
      title: `${meta.short} 第${chapterNum}章`,
      description: `${meta.name} ${chapterNum}章を読む。`,
      type: "article",
    },
  };
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
