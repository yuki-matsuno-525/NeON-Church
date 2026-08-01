import { SkeletonList } from "@/components/ui/SkeletonList";

/**
 * このページを開いた直後に出る仮の見た目。
 * 何も出ないまま待たされると「固まった」と感じるので、枠だけ先に見せる。
 */
export default function Loading() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
      <SkeletonList count={5} />
    </main>
  );
}
