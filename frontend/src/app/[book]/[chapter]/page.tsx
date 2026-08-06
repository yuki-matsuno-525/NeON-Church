import { redirect } from "next/navigation";
import { ApiError, type Book, type Chapter, type Verse } from "@/lib/api";
import { serverFetch } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { getRequestTranslation } from "@/lib/serverLanguage";
import { getBookBySlug, resolveTranslation } from "@/lib/books";
import { DEFAULT_TRANSLATION, translationLabel } from "@/lib/translations";
import { getRequestLanguage } from "@/lib/i18nServer";
import { ErrorState } from "@/components/ui/ErrorState";
import { RetryButton } from "@/components/ui";
import { ChapterReader } from "@/components/reader/ChapterReader";
import { TranslationSwitchActions } from "@/components/reader/TranslationSwitchActions";

type ChapterRead = { book: Book; chapter: Chapter; verses: Verse[] };

/**
 * 聖書本文の1章。
 *
 * 本文はサーバー側で取ってから返す。以前は画面が出てから取りに行っていたので、
 * 開いた直後は枠だけだった。どの訳で読むかは Cookie に覚えてあるので、
 * サーバーもその訳を知っている。
 *
 * 開いたあとの操作（節を選ぶ・お気に入り・コメント欄）は ChapterReader が持つ。
 */
export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ translation?: string }>;
}) {
  const { book: slug, chapter } = await params;
  const { translation: fromQuery } = await searchParams;
  const meta = getBookBySlug(slug);
  // 知らない書のときは、いつもの入口へ戻す。
  if (!meta) redirect("/matthew");

  const chapterNumber = Number(chapter);
  const t = await getT();
  const lang = await getRequestLanguage();

  // ?translation= がこの本の訳を指していればそれを優先（今日の聖句などからの遷移用）。
  const queryTranslation = fromQuery && meta.translations.some((tr) => tr.id === fromQuery) ? fromQuery : null;
  const preferred = queryTranslation ?? (await getRequestTranslation());
  // meta を確認済みなので resolveTranslation は必ず訳を返す。
  const active = resolveTranslation(slug, preferred)!;

  let data: ChapterRead;
  try {
    data = await serverFetch<ChapterRead>(
      `/references/${slug}/read/${chapterNumber}/?translation=${encodeURIComponent(active.id)}`,
    );
  } catch (cause) {
    // サーバーは「その訳にこの書が無い」「その章が無い」を code で言い分ける。
    const code = cause instanceof ApiError ? cause.code : undefined;
    const message =
      code === "book_not_found"
        ? preferred !== DEFAULT_TRANSLATION
          ? t.translationNotFound(preferred)
          : t.bookNotFound
        : code === "chapter_not_found"
          ? t.chapterNotFound
          : t.loadErrorDesc;

    return (
      <div className="p-8">
        <ErrorState
          title={t.loadErrorTitle}
          message={message}
          extraAction={
            <>
              <RetryButton label={t.retry} />
              <TranslationSwitchActions
                options={meta.translations
                  .filter((tr) => tr.id !== active.id)
                  .map((tr) => ({ id: tr.id, label: translationLabel(tr.id, lang) }))}
              />
            </>
          }
        />
      </div>
    );
  }

  return (
    <ChapterReader
      slug={slug}
      chapterNumber={chapterNumber}
      translationId={active.id}
      fromQuery={queryTranslation !== null}
      bookId={data.book.id}
      chapter={data.chapter}
      verses={data.verses}
    />
  );
}
