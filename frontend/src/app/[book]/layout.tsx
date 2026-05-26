import type { Metadata } from "next";
import { getBookBySlug } from "@/lib/books";

type Props = { params: Promise<{ book: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book: slug } = await params;
  const meta = getBookBySlug(slug);
  if (!meta) return {};
  return {
    title: meta.englishName,
    description: `Chapter list and comments for ${meta.englishName} (${meta.name}). Read, discuss, and share.`,
    openGraph: {
      title: meta.englishName,
      description: `Chapter list and comments for ${meta.englishName}.`,
      type: "website",
      images: [{ url: "/img/logo.png", width: 512, height: 512, alt: "NeON Church" }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/img/logo.png"],
    },
  };
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
