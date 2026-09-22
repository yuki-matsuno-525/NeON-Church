import Link from "next/link";
import { translationSource } from "@/lib/translations";

type Props = {
  translationId: string;
  lang: string;
};

/**
 * 本文の下に出す出典の1行（何の本文か・権利の状態）。
 * 詳しい一覧はライセンスページにあるので、ここからはそこへつなぐだけにする。
 * 出典が登録されていない訳では何も出さない。
 */
export function TranslationCredit({ translationId, lang }: Props) {
  const source = translationSource(translationId);
  if (!source) return null;
  const pick = (text: { ja: string; en: string }) => (lang === "en" ? text.en : text.ja);
  return (
    <p className="mt-6 mb-0 text-xs leading-reading text-muted">
      {pick(source.work)} · {pick(source.license)} ·{" "}
      <Link href="/licenses" className="text-muted">
        {lang === "en" ? "About sources" : "出典について"}
      </Link>
      {source.note && (
        <>
          <br />
          {pick(source.note)}
        </>
      )}
    </p>
  );
}
