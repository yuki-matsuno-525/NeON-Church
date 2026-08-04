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
        className="notfound-code"
      >
        404
      </p>
      <h1
        className="text-lg font-bold text-body m-0"
      >
        {copy.notFoundTitle}
      </h1>
      <p className="m-0 max-w-90 text-sm text-muted">
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
