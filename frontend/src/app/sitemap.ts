import type { MetadataRoute } from "next";
import { BOOKS, chapterNumbersOf } from "@/lib/books";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neon-church.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/read`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/qa`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/translations`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/search`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // 章番号は本ごとに違う（トマスは 0 始まり、Q資料はルカ由来で飛び飛び）。
  const bookPages: MetadataRoute.Sitemap = BOOKS.flatMap((book) => [
    { url: `${SITE_URL}/${book.slug}`, changeFrequency: "weekly" as const, priority: 0.7 },
    ...chapterNumbersOf(book.slug).map((n) => ({
      url: `${SITE_URL}/${book.slug}/${n}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]);

  return [...staticPages, ...bookPages];
}
