"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAnswer,
  fetchAnswerPage,
  setQuestionBestAnswer,
  type ListPage,
  type QAAnswer,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLoadMore } from "@/hooks/useLoadMore";
import { AnswerItem } from "@/components/qa/AnswerItem";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { Button, ErrorState, LoadMoreButton, SkeletonList, useToast } from "@/components/ui";
import { useT } from "@/lib/i18n";

type Props = {
  questionId: string;
  /** 質問した人。この人だけがベストアンサーを選べる */
  questionOwnerId: string;
  /**
   * サーバーが取り終えた回答の 1 ページ目。
   * 取れなかったときは省略する。その場合だけブラウザ側が取りに行く。
   */
  initial?: ListPage<QAAnswer>;
};

/**
 * 回答の一覧と、回答を書くところ。
 *
 * 1 ページ目はサーバーが取って渡してくる。ベストアンサーを選び直すと
 * 質問側の「解決済み」表示も変わるので、回答を取り直すのに加えて
 * router.refresh() でページ全体もサーバーに組み立て直してもらう。
 */
export function QAAnswerSection({ questionId, questionOwnerId, initial }: Props) {
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchPage = useCallback((page: number) => fetchAnswerPage(questionId, page), [questionId]);
  const answers = useLoadMore(fetchPage, initial);
  const reload = answers.reload;

  const isOwner = user != null && user.id === questionOwnerId;

  /** 回答が増減・変化したら、回答一覧と質問側の表示の両方を新しくする。 */
  const refreshAll = useCallback(() => {
    reload();
    router.refresh();
  }, [reload, router]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      await createAnswer(questionId, body.trim());
      setBody("");
      refreshAll();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : t.postFailed);
    } finally {
      setPosting(false);
    }
  };

  const handlePickBest = async (answerId: string | null) => {
    try {
      await setQuestionBestAnswer(questionId, answerId);
      refreshAll();
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  return (
    <>
      {showLoginModal && <LoginRequiredModal onClose={() => setShowLoginModal(false)} />}

      <h2 className="flex items-center mt-8 mb-3 text-md font-bold">
        {t.qaAnswersHeading}
        <span className="text-faint font-normal text-sm ml-2">{answers.total}</span>
      </h2>

      {answers.loading ? (
        <SkeletonList count={2} />
      ) : answers.failed ? (
        <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={answers.reload} />
      ) : answers.items.length === 0 ? (
        <p className="text-faint text-sm py-2 px-1">{t.qaNoAnswers}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {answers.items.map((answer) => (
              <AnswerItem
                key={answer.id}
                answer={answer}
                currentUserId={user?.id ?? null}
                canPickBest={isOwner}
                onPickBest={handlePickBest}
                onChanged={refreshAll}
              />
            ))}
          </div>
          <LoadMoreButton
            hasMore={answers.hasMore}
            loading={answers.loadingMore}
            onClick={answers.loadMore}
          />
        </>
      )}

      {user ? (
        <form onSubmit={handlePost} className="mt-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.qaAnswerPlaceholder}
            aria-label={t.qaAnswerPlaceholder}
            rows={4}
            className="form-control resize-y"
          />
          {/* エラー色は --state-error という存在しない変数を見ていたため、これまで赤くならなかった。
              意見フォームと同じく、決定表の危険色（text-danger）に直している。 */}
          {postError && <p className="my-1 text-xs text-danger">{postError}</p>}
          <div className="flex justify-end mt-2">
            <Button variant="primary" type="submit" disabled={posting || !body.trim()}>
              {posting ? t.posting : t.qaSubmitAnswer}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <Button variant="primary" onClick={() => setShowLoginModal(true)}>
            {t.qaLoginToAnswer}
          </Button>
        </div>
      )}
    </>
  );
}
