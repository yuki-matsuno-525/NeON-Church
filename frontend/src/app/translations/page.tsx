import Link from "next/link";
import {
  ApiError,
  translationListPath,
  type ListPage,
  type TranslationLanguage,
  type TranslationProject,
  type TranslationStatus,
} from "@/lib/api";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import type { Translations } from "@/lib/i18n";
import { LinkTabs, ListPageHeader, TabPanel } from "@/components/list";
import { EmptyState, RetryButton } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { QueryPagination } from "@/components/ui/QueryPagination";
import { ProjectCard } from "@/components/translations/ProjectCard";
import { TranslationFilters } from "@/components/translations/TranslationFilters";
import { translationUiText } from "./translationUiText";

// バックエンドが 1 ページに返す件数。ページ送りの総数を出すのに使う。
const PAGE_SIZE = 20;

/* ----- 一覧の切り替え -----
   以前は 3 つの状態を列で横に並べ、画面が狭いときだけタブに切り替えていた。
   幅の判定をブラウザ側でしていたので、開いた直後に列が並んでからタブへ変わることがあり、
   見えない 2 列ぶんも毎回取りに行っていた。
   プランの画面と同じタブに揃え、どのタブを見ているかは URL（?tab=）で表す。 */
const TABS: TranslationStatus[] = ["published", "active", "draft"];

/** 検索語と、いま開いているタブ、そのタブのページ番号。すべて URL に持つ。 */
type TranslationsSearchParams = {
  q?: string;
  target_language?: string;
  tab?: string;
  published?: string;
  active?: string;
  draft?: string;
};

/**
 * 翻訳プロジェクトの一覧。
 *
 * 開いているタブの 1 ページ目だけをサーバー側で取ってから返す。
 *
 * ブラウザ側に残しているのは検索欄だけ。どのタブの何ページ目を見ているかも
 * URL に書くので、その URL を直接開ける。
 */
export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: Promise<TranslationsSearchParams>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const targetLanguage = params.target_language ?? "";
  const t = await getT();
  const ui = translationUiText(await getRequestLanguage());
  const signedIn = await serverIsSignedIn();
  const activeTab: TranslationStatus =
    TABS.includes(params.tab as TranslationStatus) ? (params.tab as TranslationStatus) : "published";

  // 下書きは自分のものしか見られないので、未ログインのときは取りに行かない。
  const signInRequired = activeTab === "draft" && !signedIn;
  // 言語の選択肢は絞り込みを開いたときに要る。取れなくても一覧は読めるので個別に受け止める。
  const [loaded, languages] = await Promise.all([
    signInRequired ? null : loadColumn(activeTab, pageNumber(params[activeTab]), q, targetLanguage),
    serverFetchList<TranslationLanguage>("/translations/languages/").catch(() => []),
  ]);

  const tabLabel = (key: TranslationStatus) => {
    if (key === "published") return t.statusPublished;
    if (key === "active") return t.statusActive;
    return t.colDraftLabel;
  };

  return (
    <div className="page page-full">
      <ListPageHeader
        title={t.translationsTitle}
        description={t.translationsDesc}
        action={
          signedIn ? (
            <Link href="/translations/new" className="cta-button">{t.newProject}</Link>
          ) : undefined
        }
      />

      {/* 未ログインでも下書きのタブは出す。自分の下書きが残る場所だと先に分かるほうが、
          ログインする理由が伝わるため。中身はログインの案内に差し替える。 */}
      <LinkTabs
        tabs={TABS.map((key) => ({
          key,
          label: tabLabel(key),
          href: translationsHref(key, q, targetLanguage),
        }))}
        active={activeTab}
        label={t.translationTabsLabel}
        idPrefix="translations"
      />

      <TranslationFilters
        languages={languages}
        targetLanguage={targetLanguage}
        total={loaded?.page?.count ?? null}
      />

      <TabPanel idPrefix="translations" tabKey={activeTab}>
        {loaded === null ? (
          <EmptyState
            icon={<Icon name="lock" size={36} />}
            title={t.loginRequired}
            description={t.translationSignInDraft}
            action={
              <Link href={`/login?from=${encodeURIComponent("/translations?tab=draft")}`} className="btn btn-primary">
                {t.loginBtn}
              </Link>
            }
          />
        ) : (
          <TabBody
            page={loaded.page}
            current={loaded.current}
            param={activeTab}
            emptyText={t.emptyColumn}
            errorText={ui.loadError}
            retryLabel={ui.retry}
            t={t}
          />
        )}
      </TabPanel>
    </div>
  );
}

/** タブと絞り込みを保った /translations の URL。既定のタブと空の値は書かない。 */
function translationsHref(tab: TranslationStatus, q: string, targetLanguage: string): string {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (targetLanguage) qs.set("target_language", targetLanguage);
  if (tab !== "published") qs.set("tab", tab);
  const query = qs.toString();
  return query ? `/translations?${query}` : "/translations";
}

/** タブの中身。読み込めなかった / 0 件 / 一覧、の 3 通り。 */
function TabBody({
  page,
  current,
  param,
  emptyText,
  errorText,
  retryLabel,
  t,
}: {
  page: ListPage<TranslationProject> | null;
  current: number;
  param: string;
  emptyText: string;
  errorText: string;
  retryLabel: string;
  t: Translations;
}) {
  // 見た目は AsyncList の「失敗」「0 件」に合わせてある（同じ画面で並ぶため）。
  if (page === null) {
    return (
      <div role="alert" className="py-3 px-1">
        <p className="mt-0 mx-0 mb-3 text-sm text-muted">{errorText}</p>
        <RetryButton label={retryLabel} />
      </div>
    );
  }
  if (page.results.length === 0) {
    return <p className="px-1 py-2 text-sm text-faint">{emptyText}</p>;
  }
  return (
    <>
      <div className="flex flex-col gap-3">
        {page.results.map((project) => (
          <ProjectCard key={project.id} project={project} t={t} />
        ))}
      </div>
      <QueryPagination page={current} totalPages={Math.ceil(page.count / PAGE_SIZE)} param={param} />
    </>
  );
}

/**
 * 1 つのタブを取る。
 *
 * 検索語を変えると件数が減り、開いていたページが無くなることがある。
 * その場合（サーバーが「そんなページは無い」と返したとき）は 1 ページ目に戻す。
 */
async function loadColumn(
  status: TranslationStatus,
  requested: number,
  q: string,
  targetLanguage: string,
): Promise<{ page: ListPage<TranslationProject> | null; current: number }> {
  const path = (page: number) => translationListPath(status, page, q, targetLanguage);
  try {
    return { page: await serverFetchPage<TranslationProject>(path(requested)), current: requested };
  } catch (cause) {
    if (requested > 1 && cause instanceof ApiError && cause.status === 404) {
      const page = await serverFetchPage<TranslationProject>(path(1)).catch(() => null);
      return { page, current: 1 };
    }
    return { page: null, current: requested };
  }
}

/** URL のページ番号。壊れた値や 1 未満は 1 ページ目として扱う。 */
function pageNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}
