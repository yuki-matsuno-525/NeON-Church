import { Skeleton } from "@/components/ui/Skeleton";

/**
 * 章を開いた直後に出る仮の見た目。
 * ここは一覧ではなく本文なので、カードではなく「節が並んでいる」形を先に見せる。
 */
export default function Loading() {
  return (
    <main
      aria-live="polite"
      aria-busy="true"
      style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}
    >
      <Skeleton width="45%" height={26} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 28 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width="100%" height={13} />
            <Skeleton width="88%" height={13} />
          </div>
        ))}
      </div>
    </main>
  );
}
