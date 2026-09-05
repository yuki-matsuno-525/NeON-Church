import { redirect } from "next/navigation";
import { ApiError, type Book, type Chapter, type StoredTranslation, type Verse } from "@/lib/api";
import { serverFetch, serverFetchPublic } from "@/lib/apiServer";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { getRequestTranslation } from "@/lib/serverLanguage";
import { getBookBySlug, resolveTranslation } from "@/lib/books";
import { DEFAULT_TRANSLATION, translationLabel } from "@/lib/translations";
import { ErrorState } from "@/components/ui/ErrorState";
import { RetryButton } from "@/components/ui";
import { ChapterReader } from "@/components/reader/ChapterReader";
import { TranslationSwitchActions } from "@/components/reader/TranslationSwitchActions";

// translations は新しいサーバーだけが返す。入れ替えの最中は届かないことがある。
type ChapterRead = { book: Book; chapter: Chapter; verses: Verse[]; translations?: string[] };

/** 収録済みの訳の一覧。取れなくても本文は出したいので、失敗は null にして先へ進む。 */
const STORED_TRANSLATIONS_TTL_SECONDS = 60 * 60;

async function storedTranslations(): Promise<string[] | null> {
  try {
    const rows = await serverFetchPublic<StoredTranslation[]>("/bible/translations/", STORED_TRANSLATIONS_TTL_SECONDS);
    return rows.map((row) => row.id);
  } catch {
    return null;
  }
}

/**
 * 聖書本文の1章。
 *
 * 本文はサーバー側で取ってから返す。以前は画面が出てから取りに行っていたので、
 * 開いた直後は枠だけだった。どの訳で読むかは Cookie に覚えてあるので、
 * サーバーもその訳を知っている。
 *
 * 訳の候補は books.ts の宣言ではなく、サーバーが答えた「実際に本文がある訳」を使う。
 * 宣言だけ先に足した訳を選ぶと、以前はその訳が載っている書がすべて 404 になっていた。
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
  const remembered = await getRequestTranslation();
  const preferred = queryTranslation ?? remembered;
  // meta を確認済みなので resolveTranslation は必ず訳を返す。
  const active = resolveTranslation(slug, preferred)!;

  let data: ChapterRead;
  let stored: string[] | null;
  try {
    [data, stored] = await Promise.all([
      serverFetch<ChapterRead>(
        `/references/${slug}/read/${chapterNumber}/?translation=${encodeURIComponent(active.id)}`,
      ),
      storedTranslations(),
    ]);
  } catch (cause) {
    // サーバーは「その書の版が1つも無い」「その章が無い」を code で言い分ける。
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

  // 頼んだ訳と返ってきた訳が違う ＝ その訳はまだ本文が入っていない。黙って別の訳を
  // 出すと「なぜ違う言語なのか」が分からないので、本文の上で理由を伝える。
  const served = data.book.translation;
  const notice =
    served === active.id ? null : t.translationFallbackNotice(translationLabel(active.id, lang), translationLabel(served, lang));

  // 覚えている訳がサイトのどこにも無いなら、Cookie ごと直す。放っておくと
  // どの書を開いても代わりの訳になり、お知らせが出続けてしまう。
  const rememberedIsGone = stored !== null && stored.length > 0 && !stored.includes(remembered);

  return (
    <ChapterReader
      slug={slug}
      chapterNumber={chapterNumber}
      translationId={served}
      fromQuery={queryTranslation !== null}
      translations={data.translations ?? []}
      notice={notice}
      correctCookieTo={rememberedIsGone && !queryTranslation ? served : null}
      bookId={data.book.id}
      chapter={data.chapter}
      verses={data.verses}
    />
  );
}
