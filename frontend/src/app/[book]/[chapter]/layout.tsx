import type { Metadata } from "next";
import { getBookBySlug } from "@/lib/books";
import { getRequestLanguage } from "@/lib/serverLanguage";

type Props = { params: Promise<{ book: string; chapter: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug, chapter } = await params;
  const meta = getBookBySlug(slug);
  const chapterNum = Number(chapter);
  if (!meta || !Number.isFinite(chapterNum)) return {};
  const lang = await getRequestLanguage();
  const title = lang === "en" ? `${meta.englishName} ${chapterNum}` : `${meta.name} 第${chapterNum}章`;
  const description = lang === "en"
    ? `Read ${meta.englishName} chapter ${chapterNum}. Post comments on verses and the chapter.`
    : `${meta.name} 第${chapterNum}章を読み、節や章にコメントできます。`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
