import type { CommentaryWork, TranslationProject } from "@/lib/api";
import { serverFetchAll, serverFetchPublic, serverIsSignedIn } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import type { Translations } from "@/lib/i18n";
import { LinkTabs, TabPanel } from "@/components/list";
import { EmptyState } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { BookBrowser } from "@/components/read/BookBrowser";
import { ResumeLink } from "@/components/read/ResumeLink";
import { CommentaryBrowser } from "@/components/commentary/CommentaryBrowser";
import { CommentaryResumeLink } from "@/components/commentary/CommentaryResumeLink";

/* ----- 聖書と解釈書のタブ -----
   読むものは聖書の書と、教父・ラシ・カルヴァン・内村などの解釈書の2つ。プランの画面と同じタブで分け、
   どちらを見ているかは URL（?tab=）で表す。サーバー側で組み立てるので、その場所をそのまま人に渡せる。 */
const READ_TABS = ["bible", "commentary"] as const;
type ReadTab = (typeof READ_TABS)[number];

// 解釈書の一覧は、seed を入れ直したときにしか変わらない。1時間は取り置きを使う。
const WORKS_REVALIDATE_SECONDS = 3600;

/**
 * 読むところの入口。
 *
 * 聖書のタブ: 書の一覧はアプリに同梱されているので通信しない。通信が要るのは
 * 本棚に追加した公開翻訳だけなので、それをサーバー側で取ってから返す。
 * 「続きから読む」だけは、このブラウザに残した控えを見るので画面側に残す。
 *
 * 解釈書のタブ: 解釈書の一覧（ログインに関係なく同じ）を取り置きつきで取り、
 * 聖書のタブと同じ作り（検索・分類のチップ・タイル）で並べる。
 */
export default async function ReadPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) ?? {};
  const activeTab: ReadTab = READ_TABS.includes(tab as ReadTab) ? (tab as ReadTab) : "bible";
  const t = await getT();

  const tabs = READ_TABS.map((key) => ({
    key,
    label: key === "bible" ? t.readTabBible : t.commentary,
    href: key === "bible" ? "/read" : "/read?tab=commentary",
  }));

  return (
    <div className="page page-wide">
      <h1 className="text-xl font-bold mb-4">{t.read}</h1>
      <LinkTabs tabs={tabs} active={activeTab} label={t.readTabsLabel} idPrefix="read" />
      <TabPanel idPrefix="read" tabKey={activeTab} className="pt-4">
        {activeTab === "bible" ? await bibleTab() : await commentaryTab(t)}
      </TabPanel>
    </div>
  );
}

/** 聖書のタブ。本棚（公開翻訳）だけはサーバーで取る。 */
async function bibleTab() {
  const signedIn = await serverIsSignedIn();
  // 未ログインなら本棚は無い。取れなかったときは null で、その旨だけ出す。
  const library = signedIn
    ? await serverFetchAll<TranslationProject>("/translations/library/").catch(() => null)
    : [];
  return (
    <>
      <ResumeLink />
      <BookBrowser library={library ?? []} libraryFailed={library === null} />
    </>
  );
}

/** 解釈書のタブ。一覧はログインに関係なく同じなので、取り置きつきで取る。 */
async function commentaryTab(t: Translations) {
  const works = await serverFetchPublic<CommentaryWork[]>("/commentary/works/", WORKS_REVALIDATE_SECONDS).catch(
    () => null,
  );
  if (works === null) return <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} />;
  if (works.length === 0) return <EmptyState title={t.commentaryEmpty} />;
  return (
    <>
      <p className="mt-0 mb-4 text-sm text-muted">{t.commentaryDesc}</p>
      <CommentaryResumeLink />
      <CommentaryBrowser works={works} />
    </>
  );
}
