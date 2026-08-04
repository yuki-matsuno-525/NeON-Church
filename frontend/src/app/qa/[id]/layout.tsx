import type { Metadata } from "next";
import type { QAQuestion } from "@/lib/api";
import { serverFetch } from "@/lib/apiServer";

/**
 * 共有したときやタブに出る題を、その質問のものにする。
 *
 * 質問のページ自体はブラウザ側で組み立てている（回答の投稿や編集があるため）。
 * 題だけはサーバー側で決められるので、この layout が受け持つ。
 * 取れなければ、上の階層の「Q&A」のままにする。
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const question = await serverFetch<QAQuestion>(`/qa/questions/${id}/`);
    return {
      title: question.title,
      openGraph: { title: question.title },
      twitter: { title: question.title },
    };
  } catch {
    return {};
  }
}

export default function QuestionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
