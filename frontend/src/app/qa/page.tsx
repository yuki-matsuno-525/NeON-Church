import Link from "next/link";
import type { Book, ListPage, QAQuestion, QuestionListParams, Tag } from "@/lib/api";
import { questionListPath } from "@/lib/api";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { buildCatalog, catalogBookIdParam } from "@/lib/bookCatalog";
import { ListPageHeader } from "@/components/list";
import { EmptyState, ErrorState, RetryButton } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { QAAskPanel } from "@/components/qa/QAAskPanel";
import { QABoard } from "@/components/qa/QABoard";
import { QAFilters } from "@/components/qa/QAFilters";

/** 絞り込みも「質問する」を開いているかも、すべて URL で表す。 */
type QASearchParams = { book?: string; version?: string; tag?: string; q?: string; ask?: string };
const PARAM_KEYS = ["book", "version", "tag", "q", "ask"] as const;

/**
 * Q&A の一覧。
 *
 * 質問はサーバー側で取ってから返す。以前は画面が出てから取りに行っていたので、
 * 開いた直後は枠だけが並んでいた。
 *
 * ブラウザ側に残しているのは、絞り込みの操作・「もっと見る」・投稿フォームだけ。
 * 絞り込みは URL に書くので、その URL を直接開いても同じ結果になる。
 */
export default async function QAPage({ searchParams }: { searchParams: Promise<QASearchParams> }) {
  const params = await searchParams;
  const slug = params.book ?? "";
  const version = params.version ?? "";
  const tagId = params.tag ?? "";
  const q = params.q ?? "";
  const asking = params.ask === "1";

  const t = await getT();
  const signedIn = await serverIsSignedIn();

  // 書やタグが取れなくても質問は読めるので、それぞれ個別に受け止める。
  const [dbBooks, tags] = await Promise.all([
    serverFetchList<Book>("/books/").catch(() => null),
    serverFetchList<Tag>("/tags/").catch(() => null),
  ]);
  const catalog = dbBooks ? buildCatalog(dbBooks) : [];
  // 訳を選んでいなければ、その書の全訳をまとめて絞る。
  const bookId = catalogBookIdParam(catalog, slug, version);
  const filters: QuestionListParams = { book_id: bookId, tag_id: tagId || undefined, q };

  const [answered, unanswered] = await Promise.all([
    loadQuestions({ ...filters, answered: true }),
    loadQuestions({ ...filters, answered: false }),
  ]);

  const failed = answered === undefined && unanswered === undefined;
  const total = answered && unanswered ? answered.count + unanswered.count : null;
  const askHref = qaHref(params, { ask: "1" });
  const backHref = qaHref(params, { ask: null });

  return (
    <div className="page page-full">
      <ListPageHeader
        title={t.qaTitle}
        description={t.qaDesc}
        action={
          asking ? undefined : (
            <Link href={askHref} className="btn btn-secondary">
              <Icon name="help-circle" size={14} />
              {t.askQuestion}
            </Link>
          )
        }
      />

      {asking && <QAAskPanel signedIn={signedIn} catalog={catalog} tags={tags ?? []} backHref={backHref} />}

      <QAFilters
        catalog={catalog}
        catalogFailed={dbBooks === null}
        tags={tags ?? []}
        tagsFailed={tags === null}
        slug={slug}
        version={version}
        tagId={tagId}
        total={total}
      />

      {failed ? (
        <ErrorState
          title={t.loadErrorTitle}
          message={t.loadErrorDesc}
          extraAction={<RetryButton label={t.retry} />}
        />
      ) : total === 0 ? (
        <EmptyState
          title={t.qaEmpty}
          description={t.emptyQaDesc}
          action={
            <Link href={askHref} className="btn btn-primary">
              {t.emptyQaCta}
            </Link>
          }
        />
      ) : (
        <QABoard bookId={bookId} tagId={tagId || undefined} q={q} answered={answered} unanswered={unanswered} />
      )}
    </div>
  );
}

/** 1 ページ目を取る。取れなければ undefined を返し、ブラウザ側の取り直しに任せる。 */
function loadQuestions(params: QuestionListParams): Promise<ListPage<QAQuestion> | undefined> {
  return serverFetchPage<QAQuestion>(questionListPath(params)).catch(() => undefined);
}

/** いまの絞り込みを保ったまま、一部だけ差し替えた /qa の URL を作る。null は削除。 */
function qaHref(params: QASearchParams, changes: Partial<Record<(typeof PARAM_KEYS)[number], string | null>>): string {
  const merged: Record<string, string | null | undefined> = { ...params, ...changes };
  const qs = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = merged[key];
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/qa?${query}` : "/qa";
}
