"use client";

import { SectionError } from "@/components/layout/SectionError";

/**
 * どの区画にも属さない画面で想定外のエラーが起きたときの受け皿。
 * /read や /articles など主要な区画は、それぞれの error.tsx が先に受け止める。
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <SectionError error={error} onRetry={unstable_retry} />;
}
