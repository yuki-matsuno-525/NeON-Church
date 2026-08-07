import { SkeletonList } from "@/components/ui/SkeletonList";

/**
 * 質問1件を開いた直後に出る仮の見た目。
 * 一覧の枠（5枚）ではなく、質問1件と回答ぶんの枠にしている。
 */
export default function Loading() {
  return (
    <main className="page page-narrow">
      <SkeletonList count={3} />
    </main>
  );
}
