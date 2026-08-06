import type { TranslationProject } from "@/lib/api";
import { serverFetchAll, serverIsSignedIn } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { BookBrowser } from "@/components/read/BookBrowser";
import { ResumeLink } from "@/components/read/ResumeLink";

/**
 * 読むところの入口。書を選ぶ画面。
 *
 * 書の一覧はアプリに同梱されているので通信しない。通信が要るのは
 * 本棚に追加した公開翻訳だけなので、それをサーバー側で取ってから返す。
 * 「続きから読む」だけは、このブラウザに残した控えを見るので画面側に残す。
 */
export default async function ReadPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const t = await getT();
  const signedIn = await serverIsSignedIn();

  // 未ログインなら本棚は無い。取れなかったときは null で、その旨だけ出す。
  const library = signedIn
    ? await serverFetchAll<TranslationProject>("/translations/library/").catch(() => null)
    : [];

  return (
    <div className="page page-wide">
      <h1 className="text-xl font-bold mb-6">{t.readTitle}</h1>

      <ResumeLink />

      <BookBrowser library={library ?? []} libraryFailed={library === null} q={q ?? ""} />
    </div>
  );
}
