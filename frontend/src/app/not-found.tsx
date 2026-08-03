import Link from "next/link";
import type { Metadata } from "next";
import { siteCopy } from "@/lib/siteCopy";
import { getRequestLanguage } from "@/lib/serverLanguage";

export async function generateMetadata(): Promise<Metadata> {
  const copy = siteCopy[await getRequestLanguage()];
  return { title: copy.notFoundMetadata };
}

export default async function NotFound() {
  const copy = siteCopy[await getRequestLanguage()];
  return (
    <div
      className="flex flex-col items-center justify-center min-h-page py-8 px-6 text-center gap-4"
    >
      <p
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "rgba(193, 143, 255, 0.25)",
          margin: 0,
          lineHeight: 1,
          fontFamily: "var(--font-serif)",
        }}
      >
        404
      </p>
      <h1
        className="text-lg font-bold text-body m-0"
      >
        {copy.notFoundTitle}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 360 }}>
        {copy.notFoundDescription}
      </p>
      <Link
        href="/"
        className="btn btn-primary mt-2"
        
      >
        {copy.notFoundHome}
      </Link>
    </div>
  );
}
