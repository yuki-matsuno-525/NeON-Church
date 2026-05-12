import type { Metadata } from "next";
import { getBookBySlug } from "@/lib/books";

type Props = { params: Promise<{ book: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug } = await params;
  const meta = getBookBySlug(slug);
  if (!meta) return {};
  return {
    title: meta.name,
    description: `${meta.name}の章一覧とコメント。聖書を読んで語り合おう。`,
    openGraph: {
      title: meta.name,
      description: `${meta.name}の章一覧とコメント。`,
      type: "website",
    },
  };
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
