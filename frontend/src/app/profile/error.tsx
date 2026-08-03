"use client";

import { SectionError } from "@/components/layout/SectionError";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <SectionError error={error} onRetry={unstable_retry} />;
}
