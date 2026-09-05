import type { Metadata } from "next";
import Link from "next/link";
import type { QAAnswer, QAQuestion } from "@/lib/api";
import { serverFetch, serverFetchPage } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { ErrorState } from "@/components/ui";
import { QAAnswerSection } from "@/components/qa/QAAnswerSection";
import { QuestionArticle } from "@/components/qa/QuestionArticle";
import { Breadcrumb } from "@/components/list";

/** 共有したときやタブに出る題を、その質問のものにする。 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const question = await serverFetch<QAQuestion>(`/qa/questions/${id}/`);
    return {
      title: question.title,
      openGraph: { title: question.title, description: question.body.slice(0, 120) },
      twitter: { title: question.title, description: question.body.slice(0, 120) },
    };
  } catch {
    return {};
  }
}

/**
 * Q&A の質問1件のページ。
 *
 * 一覧はここへの入り口に徹し、読むのも書くのもこのページで完結させる。
 * 読書ページの Q&A タブからも、通知からもここへ来る。
 *
 * 質問と回答の1ページ目はサーバー側で取ってから返す。以前は画面が出てから
 * 取りに行っていたので、開いた直後は枠だけだった。ブラウザ側に残しているのは
 * 書き込む操作（書き直す・消す・答える・ベストアンサーを選ぶ）だけ。
 */
export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();

  let question: QAQuestion;
  try {
    question = await serverFetch<QAQuestion>(`/qa/questions/${id}/`);
  } catch {
    return (
      <div className="page page-narrow">
        <ErrorState
          title={t.qaQuestionNotFound}
          extraAction={<Link href="/qa" className="btn btn-ghost">{t.qaBackToList}</Link>}
        />
      </div>
    );
  }

  // 回答が取れなくても質問は読める。取れなかったときはブラウザ側の取り直しに任せる。
  const answers = await serverFetchPage<QAAnswer>(`/qa/questions/${id}/answers/`).catch(() => undefined);

  return (
    <div className="page page-narrow">
      {/* 戻る道はパンくずに任せる（他の画面と同じ形にした） */}
      <div className="mb-3">
        <Breadcrumb items={[{ label: t.qaTitle, href: "/qa" }, { label: question.title }]} />
      </div>

      <QuestionArticle question={question} />

      <QAAnswerSection questionId={id} questionOwnerId={question.user.id} initial={answers} />
    </div>
  );
}
