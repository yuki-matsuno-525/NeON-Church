import { SkeletonList } from "@/components/ui/SkeletonList";

/** 開いた直後に出る仮の見た目。 */
export default function Loading() {
  return (
    <main className="page page-wide">
      <SkeletonList count={5} />
    </main>
  );
}
