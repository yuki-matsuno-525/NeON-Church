import Link from "next/link";
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
export default async function ReadPage() {
  const t = await getT();
  const signedIn = await serverIsSignedIn();

  // 未ログインなら本棚は無い。取れなかったときは null で、その旨だけ出す。
  const library = signedIn
    ? await serverFetchAll<TranslationProject>("/translations/library/").catch(() => null)
    : [];

  return (
    <div className="page page-wide">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-xl font-bold m-0">{t.readTitle}</h1>
        {/* 本文と並ぶもう1つの読み物。教父・ラシ・カルヴァン・内村などの解釈書。 */}
        <Link href="/commentary" className="text-sm text-accent no-underline">
          {t.commentary} →
        </Link>
      </div>

      <ResumeLink />

      <BookBrowser library={library ?? []} libraryFailed={library === null} />
    </div>
  );
}
