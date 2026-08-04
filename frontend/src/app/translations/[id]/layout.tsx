import type { Metadata } from "next";
import type { TranslationProject } from "@/lib/api";
import { serverFetch } from "@/lib/apiServer";

/**
 * 共有したときやタブに出る題を、そのプロジェクトのものにする。
 *
 * プロジェクトのページ自体はブラウザ側で組み立てている（訳文の入力や
 * 参加申請があるため）。題だけはサーバー側で決められるので、
 * この layout が受け持つ。取れなければ上の階層の題のままにする。
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const project = await serverFetch<TranslationProject>(`/translations/${id}/`);
    return {
      title: project.name,
      description: project.description ?? undefined,
      openGraph: { title: project.name, description: project.description ?? undefined },
      twitter: { title: project.name, description: project.description ?? undefined },
    };
  } catch {
    return {};
  }
}

export default function TranslationProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
