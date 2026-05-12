import type { MetadataRoute } from "next";
import { BOOKS } from "@/lib/books";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neon-church.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/read`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/qa`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/translations`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/search`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const bookPages: MetadataRoute.Sitemap = BOOKS.flatMap((book) => [
    { url: `${SITE_URL}/${book.slug}`, changeFrequency: "weekly" as const, priority: 0.7 },
    ...Array.from({ length: book.totalChapters }, (_, i) => ({
      url: `${SITE_URL}/${book.slug}/${i + 1}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]);

  return [...staticPages, ...bookPages];
}
