import Link from "next/link";
import type { Plan, PlanSubscription } from "@/lib/api";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { visibilityLabel } from "@/lib/plans";
import type { Translations } from "@/lib/i18n";
import { planUiText } from "@/components/plans/planUiText";
import { type IconName } from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui";
import { RetryButton } from "@/components/ui/RetryButton";
import { ListColumn, ListPageHeader } from "@/components/list";
import type { Tone } from "@/components/list/tone";

/**
 * 読書プランの一覧。
 *
 * ここは押す・書き込むところが無いので、丸ごとサーバー側で組み立てる。
 * 以前は画面が出てからプランを取りに行っていたので、開いた直後は
 * 枠だけが並んでいた。
 */
export default async function PlansPage() {
  const t = await getT();
  const supplementalText = planUiText(await getRequestLanguage());
  const signedIn = await serverIsSignedIn();

  // 取れなかったものは null。読書中の一覧だけは、取れなくても
  // プランは読めるので黙って空にする。
  const [publicPlans, myPlans, reading] = await Promise.all([
    loadPlans("/plans/"),
    signedIn ? loadPlans("/plans/?mine=true") : [],
    signedIn ? serverFetchList<PlanSubscription>("/plan-subscriptions/").catch(() => []) : [],
  ]);
  const failed = publicPlans === null || myPlans === null;

  return (
    <div className="page page-full">
      <ListPageHeader
        title={t.plansTitle}
        description={t.plansDesc}
        action={signedIn ? <Link href="/plans/new" className="cta-button">{t.planNew}</Link> : undefined}
      />

      {!failed && reading.length > 0 && (
        <section className="list-column mb-4">
          <h2 className="text-md font-bold mt-0 mx-0 mb-3">{t.planReadingNow}</h2>
          <div className="flex flex-wrap gap-2">
            {reading.map((subscription) => (
              <Link
                key={subscription.id}
                href={`/plans/${subscription.plan}`}
                className="card-glow card-glow-interactive py-3 px-3 tap-target inline-flex items-center no-underline text-inherit text-sm font-bold"
              >
                {subscription.plan_title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {failed ? (
        <ErrorState
          tone="warning"
          title={supplementalText.loadErrorTitle}
          message={supplementalText.loadErrorDescription}
          extraAction={<RetryButton label={t.retry} />}
        />
      ) : (
        <div className="list-board">
          {signedIn && (
            <PlanColumn
              title={t.planMineTitle}
              desc={t.planMineDesc}
              icon="book-open"
              tone="active"
              plans={myPlans ?? []}
              empty={t.planMineEmpty}
              editable
              t={t}
            />
          )}
          <PlanColumn
            title={t.planPublicTitle}
            desc={t.planPublicDesc}
            icon="globe"
            tone="ok"
            plans={publicPlans ?? []}
            empty={t.planPublicEmpty}
            t={t}
          />
        </div>
      )}
    </div>
  );
}

/** 一覧を取る。取れなければ null を返し、呼ぶ側で「読み込めませんでした」を出す。 */
function loadPlans(path: string): Promise<Plan[] | null> {
  return serverFetchPage<Plan>(path)
    .then((page) => page.results)
    .catch(() => null);
}

function PlanColumn({
  title,
  desc,
  icon,
  tone,
  plans,
  empty,
  editable = false,
  t,
}: {
  title: string;
  desc: string;
  icon: IconName;
  tone: Tone;
  plans: Plan[];
  empty: string;
  editable?: boolean;
  t: Translations;
}) {
  return (
    <ListColumn icon={icon} tone={tone} title={title} count={plans.length} description={desc}>
      {plans.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={editable ? `/plans/${plan.id}/edit` : `/plans/${plan.id}`}
              className="no-underline text-inherit"
            >
              <div className="card-glow card-glow-interactive p-4">
                <div className="flex justify-end mb-3">
                  <span className={`badge ${plan.visibility === "public" ? "badge-tone tone-ok" : "badge-muted"}`}>
                    {visibilityLabel(plan.visibility, t)}
                  </span>
                </div>
                <h3 className="card-title">{plan.title}</h3>
                {plan.description && <p className="card-summary">{plan.description}</p>}
                <div className="flex gap-2 text-xs flex-wrap">
                  <span className="meta-pill">{plan.owner_username}</span>
                  <span className="meta-pill">{t.planDayCount(plan.day_count)}</span>
                  {plan.reader_count > 0 && <span className="meta-pill">{t.planReaderCount(plan.reader_count)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ListColumn>
  );
}
