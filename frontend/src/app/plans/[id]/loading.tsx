import { SkeletonList } from "@/components/ui/SkeletonList";

/**
 * サーバー側で中身を取っているあいだに出る仮の見た目。
 * 何も出ないまま待たされると「固まった」と感じるので、枠だけ先に見せる。
 */
export default function Loading() {
  return (
    <main className="page page-detail">
      <SkeletonList count={3} />
    </main>
  );
}
