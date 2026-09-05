import Link from "next/link";
import type { Book, ListPage, QAQuestion, QuestionListParams, Tag } from "@/lib/api";
import { questionListPath } from "@/lib/api";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { buildCatalog, catalogBookIdParam } from "@/lib/bookCatalog";
import { LinkTabs, ListPageHeader, TabPanel } from "@/components/list";
import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { QAAskPanel } from "@/components/qa/QAAskPanel";
import { QAQuestionFeed } from "@/components/qa/QAQuestionFeed";
import { QAFilters } from "@/components/qa/QAFilters";

/** 絞り込みも、どのタブを見ているかも、「質問する」を開いているかも、すべて URL で表す。 */
type QASearchParams = { book?: string; version?: string; tag?: string; q?: string; ask?: string; tab?: string };
const PARAM_KEYS = ["book", "version", "tag", "q", "ask", "tab"] as const;

/* ----- 一覧の切り替え -----
   以前は「未解決」「解決済み」を列で横に並べ、画面が狭いときだけタブに
   切り替えていた。幅の判定をブラウザ側でしていたので、開いた直後に列が並んでから
   タブへ変わることがあり、見えない側も毎回取りに行っていた。
   プランの画面と同じタブに揃える。最初に開くのは、答えを待っている「未解決」。 */
const QA_TABS = ["unanswered", "answered"] as const;
type QATabKey = (typeof QA_TABS)[number];

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
  const activeTab: QATabKey =
    QA_TABS.includes(params.tab as QATabKey) ? (params.tab as QATabKey) : "unanswered";

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

  // 開いているタブのぶんだけ取る。
  const answered = activeTab === "answered";
  const questions = await loadQuestions({ ...filters, answered });

  const total = questions?.count ?? null;
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

      <LinkTabs
        tabs={QA_TABS.map((key) => ({
          key,
          label: key === "answered" ? t.filterAnswered : t.filterUnanswered,
          href: qaHref(params, { tab: key === "unanswered" ? null : key, ask: null }),
        }))}
        active={activeTab}
        label={t.qaTabsLabel}
        idPrefix="qa"
      />

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

      {/* サーバー側で取れなかったときは initial を渡さない。
          その場合だけブラウザ側が取りに行き、それも駄目なら
          一覧の中に「読み込めませんでした」と再試行が出る。 */}
      <TabPanel idPrefix="qa" tabKey={activeTab}>
        {/* 0 件のときは、そのタブに何も無いと言ったうえで質問へ誘う。
            以前は「質問がまだ 1 件も無い」ときだけこれを出していたが、
            タブに分かれたので「このタブには無い」を出す場所になった。 */}
        <QAQuestionFeed
          answered={answered}
          bookId={bookId}
          tagId={tagId || undefined}
          q={q}
          initial={questions}
          empty={
            <EmptyState
              title={t.qaEmptyColumn}
              description={t.emptyQaDesc}
              action={
                <Link href={askHref} className="btn btn-primary">
                  {t.emptyQaCta}
                </Link>
              }
            />
          }
        />
      </TabPanel>
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
