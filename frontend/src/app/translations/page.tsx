import Link from "next/link";
import { translationListPath, type ListPage, type TranslationProject, type TranslationStatus } from "@/lib/api";
import { serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { ListPageHeader } from "@/components/list";
import type { Tone } from "@/components/list/tone";
import type { IconName } from "@/components/ui/Icon";
import { RetryButton } from "@/components/ui";
import { QueryPagination } from "@/components/ui/QueryPagination";
import { ProjectCard } from "@/components/translations/ProjectCard";
import { TranslationBoard, type BoardColumn } from "@/components/translations/TranslationBoard";
import { TranslationSearch } from "@/components/translations/TranslationSearch";
import { translationUiText } from "./translationUiText";

// バックエンドが 1 ページに返す件数。ページ送りの総数を出すのに使う。
const PAGE_SIZE = 20;

// ステータスごとのカラム。色はステータスの意味に合わせる（公開=緑 / 進行中=アクセント / 下書き=琥珀）。
const COLUMNS: { key: TranslationStatus; icon: IconName; tone: Tone }[] = [
  { key: "published", icon: "check-circle", tone: "ok" },
  { key: "active",    icon: "circle-dot",   tone: "active" },
  { key: "draft",     icon: "lock",         tone: "wait" },
];

/** 検索語と、列ごとのページ番号。どちらも URL に持つ。 */
type TranslationsSearchParams = { q?: string; published?: string; active?: string; draft?: string };

/**
 * 翻訳プロジェクトの一覧。
 *
 * 3 つの列ぶんをサーバー側で取ってから返す。以前は画面が出てから列ごとに
 * 取りに行っていたので、開いた直後は枠だけが 3 つ並んでいた。
 *
 * ブラウザ側に残しているのは、検索欄・ページ送り・スマホの列切り替えだけ。
 * どの列の何ページ目を見ているかも URL に書くので、その URL を直接開ける。
 */
export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: Promise<TranslationsSearchParams>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const t = await getT();
  const ui = translationUiText(await getRequestLanguage());
  const signedIn = await serverIsSignedIn();

  // 下書きは自分のものしか見られないので、ログインしていないときは列ごと出さない。
  const visible = signedIn ? COLUMNS : COLUMNS.filter((column) => column.key !== "draft");

  const pages = await Promise.all(
    visible.map((column) =>
      // 取れなかった列は null。他の列は読めるので、列ごとに受け止める。
      serverFetchPage<TranslationProject>(
        translationListPath(column.key, pageNumber(params[column.key]), q),
      ).catch(() => null),
    ),
  );

  const columnLabel = (key: TranslationStatus) => {
    if (key === "published") return t.statusPublished;
    if (key === "active") return t.statusActive;
    return t.colDraftLabel;
  };
  const columnDesc = (key: TranslationStatus) => {
    if (key === "published") return t.colPublishedDesc;
    if (key === "active") return t.colActiveDesc;
    return t.colDraftDesc;
  };

  const columns: BoardColumn[] = visible.map((column, index) => ({
    key: column.key,
    icon: column.icon,
    tone: column.tone,
    title: columnLabel(column.key),
    description: columnDesc(column.key),
    count: pages[index]?.count ?? 0,
    body: (
      <ColumnBody
        page={pages[index]}
        current={pageNumber(params[column.key])}
        param={column.key}
        statusLabel={columnLabel(column.key)}
        emptyText={t.emptyColumn}
        errorText={ui.loadError}
        retryLabel={ui.retry}
        createdByLabel={t.createdBy}
        progressLabel={t.progress}
      />
    ),
  }));

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

      <TranslationSearch
        q={q}
        label={t.projectSearchLabel}
        placeholder={t.projectSearchPlaceholder}
        pageParams={COLUMNS.map((column) => column.key)}
      />

      <TranslationBoard columns={columns} label={t.translationsTitle} idPrefix="translations" />
    </div>
  );
}

/** 列の中身。読み込めなかった / 0 件 / 一覧、の 3 通り。 */
function ColumnBody({
  page,
  current,
  param,
  statusLabel,
  emptyText,
  errorText,
  retryLabel,
  createdByLabel,
  progressLabel,
}: {
  page: ListPage<TranslationProject> | null;
  current: number;
  param: string;
  statusLabel: string;
  emptyText: string;
  errorText: string;
  retryLabel: string;
  createdByLabel: string;
  progressLabel: string;
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
          <ProjectCard
            key={project.id}
            project={project}
            statusLabel={statusLabel}
            createdByLabel={createdByLabel}
            progressLabel={progressLabel}
          />
        ))}
      </div>
      <QueryPagination page={current} totalPages={Math.ceil(page.count / PAGE_SIZE)} param={param} />
    </>
  );
}

/** URL のページ番号。壊れた値や 1 未満は 1 ページ目として扱う。 */
function pageNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}
