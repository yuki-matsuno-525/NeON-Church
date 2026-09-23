import type { CommentaryWork } from "@/lib/api";
import { serverFetchPublic } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { EmptyState } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { CommentaryBrowser } from "@/components/commentary/CommentaryBrowser";

// 解釈書の一覧は、seed を入れ直したときにしか変わらない。1時間は取り置きを使う。
const WORKS_REVALIDATE_SECONDS = 3600;

/**
 * 解釈書の入口。「読む」の入口（app/read/page.tsx）と同じ作り:
 * 見出しと説明、その下に検索・立場のチップ・本のタイル（CommentaryBrowser）。
 * 一覧はログインに関係なく同じなので、取り置きを使って速く返す。
 */
export default async function CommentaryListPage() {
  const t = await getT();
  const works = await serverFetchPublic<CommentaryWork[]>("/commentary/works/", WORKS_REVALIDATE_SECONDS).catch(
    () => null,
  );

  return (
    <div className="page page-wide">
      <h1 className="text-xl font-bold mb-2">{t.commentary}</h1>
      <p className="mt-0 mb-6 text-sm text-muted">{t.commentaryDesc}</p>
      {works === null ? (
        <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} />
      ) : works.length === 0 ? (
        <EmptyState title={t.commentaryEmpty} />
      ) : (
        <CommentaryBrowser works={works} />
      )}
    </div>
  );
}
