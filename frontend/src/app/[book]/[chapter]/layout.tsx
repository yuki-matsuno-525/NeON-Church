import type { Metadata } from "next";
import { getBookBySlug } from "@/lib/books";

type Props = { params: Promise<{ book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter } = await params;
  const meta = getBookBySlug(slug);
  const chapterNum = Number(chapter);
  if (!meta || !chapterNum) return {};
  return {
    title: `${meta.englishName} ${chapterNum}`,
    description: `Read ${meta.englishName} chapter ${chapterNum}. Post comments on verses and the chapter.`,
    openGraph: {
      title: `${meta.englishName} ${chapterNum}`,
      description: `Read ${meta.englishName} chapter ${chapterNum}.`,
      type: "article",
    },
  };
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
