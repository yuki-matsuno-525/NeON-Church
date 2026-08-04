import type { Metadata } from "next";
import Link from "next/link";
import type { Plan } from "@/lib/api";
import { serverFetch } from "@/lib/apiServer";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { visibilityLabel } from "@/lib/plans";
import { planUiText } from "@/components/plans/planUiText";
import { PlanOwnerActions } from "@/components/plans/PlanOwnerActions";
import { PlanReader } from "@/components/plans/PlanReader";
import { ErrorState } from "@/components/ui";

/** 共有したときやタブに出る題を、そのプランのものにする。 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const plan = await serverFetch<Plan>(`/plans/${id}/`);
    return {
      title: plan.title,
      description: plan.description ?? undefined,
      openGraph: { title: plan.title, description: plan.description ?? undefined },
      twitter: { title: plan.title, description: plan.description ?? undefined },
    };
  } catch {
    return {};
  }
}

/**
 * 読書プランの詳細。
 *
 * 題・説明・覚え書きはサーバー側で組み立てて返す。以前は画面が出てから
 * 取りに行っていたので、開いた直後は空の枠だった。
 *
 * ブラウザ側に残しているのは、見ている人によって変わる部分だけ:
 * 作った人にだけ出す「編集」と、読み進めるところ（PlanReader）。
 */
export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const text = planUiText(await getRequestLanguage());

  let plan: Plan;
  try {
    // 進み具合は人によって違うので、その人の Cookie を付けて取る。
    plan = await serverFetch<Plan>(`/plans/${id}/`);
  } catch {
    return (
      <div className="page page-detail">
        <ErrorState
          title={t.planCannotRead}
          message={text.unreadableDescription}
          extraAction={<Link href="/plans" className="action-link">{t.planBackToList}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page page-detail">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {plan.visibility !== "public" && (
          <span className="badge badge-muted">{visibilityLabel(plan.visibility, t)}</span>
        )}
        <PlanOwnerActions planId={plan.id} ownerUsername={plan.owner_username} />
      </div>

      <h1 className="page-title">{plan.title}</h1>
      <div className="text-sm text-muted mb-4">
        <Link href={`/profile/${plan.owner_username}`} className="text-muted no-underline">
          {plan.owner_username}
        </Link>
        <span className="ml-2">{t.planDayCount(plan.day_count)}</span>
      </div>

      {plan.description && <p className="text-sm leading-reading mt-0 mx-0 mb-4">{plan.description}</p>}

      {plan.note && (
        <div className="note-box">
          <div className="text-xs text-faint mb-1">{t.planNoteLabel}</div>
          <p className="m-0 text-sm leading-reading whitespace-pre-wrap">{plan.note}</p>
        </div>
      )}

      <PlanReader initialPlan={plan} />
    </div>
  );
}
