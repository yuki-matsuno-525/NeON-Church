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
import { ListColumn, ListPageHeader, visibilityBadgeClass } from "@/components/list";
import type { Tone } from "@/components/list/tone";

/* ----- 一覧の切り替え -----
   以前は「読んでいるプラン」を小さな札で上に並べ、その下に「自分の」「公開」の
   2 列を置いていた。読書プランは続けることが中身なので、毎日戻ってくる
   「読んでいる」を最初に開く形にした。

   どのタブを見ているかは URL（?tab=）で表す。この画面はサーバー側で
   組み立てるので、ブラウザ側の状態を持てないため。URL に出るぶん、
   その場所をそのまま人に渡せるし、戻るボタンも効く。 */
type PlanTabKey = "reading" | "done" | "mine" | "find";
const PLAN_TABS: { key: PlanTabKey; icon: IconName; tone: Tone }[] = [
  { key: "reading", icon: "book-open",    tone: "active" },
  { key: "done",    icon: "check-circle", tone: "ok" },
  { key: "mine",    icon: "lock",         tone: "wait" },
  { key: "find",    icon: "globe",        tone: "ok" },
];

/**
 * 読書プランの一覧。
 *
 * ここは押す・書き込むところが無いので、丸ごとサーバー側で組み立てる。
 * 以前は画面が出てからプランを取りに行っていたので、開いた直後は
 * 枠だけが並んでいた。
 */
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const t = await getT();
  const supplementalText = planUiText(await getRequestLanguage());
  const signedIn = await serverIsSignedIn();
  const requested = (await searchParams).tab;
  const activeTab: PlanTabKey =
    PLAN_TABS.some((tab) => tab.key === requested) ? (requested as PlanTabKey) : "reading";

  // 取れなかったものは null。読書中の一覧だけは、取れなくても
  // プランは読めるので黙って空にする。
  const [publicPlans, myPlans, reading] = await Promise.all([
    loadPlans("/plans/"),
    signedIn ? loadPlans("/plans/?mine=true") : [],
    signedIn ? serverFetchList<PlanSubscription>("/plan-subscriptions/").catch(() => []) : [],
  ]);
  const failed = publicPlans === null || myPlans === null;

  // 読み終わっても購読は残る（is_active が落ちるのは「やめる」を押したときだけ）ので、
  // 読書中と読み終わったの区別は、終わった日数がプランの日数に届いたかで決める。
  const isFinished = (s: PlanSubscription) => s.day_count > 0 && s.completed_count >= s.day_count;
  const readingNow = reading.filter((s) => !isFinished(s));
  const finished = reading.filter(isFinished);

  const tabLabel = (key: PlanTabKey) =>
    key === "reading" ? t.planTabReading
    : key === "done" ? t.planTabDone
    : key === "mine" ? t.planTabMine
    : t.planTabFind;

  return (
    <div className="page page-full">
      <ListPageHeader
        title={t.plansTitle}
        description={t.plansDesc}
        action={signedIn ? <Link href="/plans/new" className="cta-button">{t.planNew}</Link> : undefined}
      />

      {/* 未ログインでは自分のものが無く「さがす」しか無いので、タブを出さない。 */}
      {signedIn && (
        <div role="tablist" aria-label={t.planTabsLabel} className="tab-bar">
          {PLAN_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "reading" ? "/plans" : `/plans?tab=${tab.key}`}
              role="tab"
              aria-selected={tab.key === activeTab}
              id={`plans-tab-${tab.key}`}
              aria-controls={`plans-panel-${tab.key}`}
              className={`tab-underline${tab.key === activeTab ? " tab-underline-active" : ""}`}
            >
              {tabLabel(tab.key)}
            </Link>
          ))}
        </div>
      )}

      {failed ? (
        <ErrorState
          tone="warning"
          title={supplementalText.loadErrorTitle}
          message={supplementalText.loadErrorDescription}
          extraAction={<RetryButton label={t.retry} />}
        />
      ) : !signedIn ? (
        <PlanColumn
          title={t.planPublicTitle}
          desc={t.planPublicDesc}
          icon="globe"
          tone="ok"
          plans={publicPlans ?? []}
          empty={t.planPublicEmpty}
          t={t}
        />
      ) : activeTab === "reading" || activeTab === "done" ? (
        <SubscriptionColumn
          title={activeTab === "reading" ? t.planTabReading : t.planTabDone}
          desc={activeTab === "reading" ? t.planReadingNow : t.planTabDone}
          icon={activeTab === "reading" ? "book-open" : "check-circle"}
          tone={activeTab === "reading" ? "active" : "ok"}
          subscriptions={activeTab === "reading" ? readingNow : finished}
          empty={activeTab === "reading" ? t.planReadingEmpty : t.planDoneEmpty}
          panelId={`plans-panel-${activeTab}`}
          tabId={`plans-tab-${activeTab}`}
          t={t}
        />
      ) : activeTab === "mine" ? (
        <PlanColumn
          title={t.planMineTitle}
          desc={t.planMineDesc}
          icon="lock"
          tone="active"
          plans={myPlans ?? []}
          empty={t.planMineEmpty}
          editable
          panelId="plans-panel-mine"
          tabId="plans-tab-mine"
          t={t}
        />
      ) : (
        <PlanColumn
          title={t.planPublicTitle}
          desc={t.planPublicDesc}
          icon="globe"
          tone="ok"
          plans={publicPlans ?? []}
          empty={t.planPublicEmpty}
          panelId="plans-panel-find"
          tabId="plans-tab-find"
          t={t}
        />
      )}
    </div>
  );
}

/**
 * 読んでいる／読み終わったプランの一覧。
 *
 * 以前は小さな札を横に並べるだけで、プランで一番知りたい「どこまで進んだか」が
 * 出ていなかった。翻訳カードと同じ進捗バーを持つカードにする。
 */
function SubscriptionColumn({
  title, desc, icon, tone, subscriptions, empty, panelId, tabId, t,
}: {
  title: string;
  desc: string;
  icon: IconName;
  tone: Tone;
  subscriptions: PlanSubscription[];
  empty: string;
  panelId: string;
  tabId: string;
  t: Translations;
}) {
  return (
    <ListColumn icon={icon} tone={tone} title={title} description={desc} id={panelId} labelledBy={tabId}>
      {subscriptions.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {subscriptions.map((s) => {
            const pct = s.day_count > 0 ? Math.round((s.completed_count / s.day_count) * 100) : 0;
            const done = s.day_count > 0 && s.completed_count >= s.day_count;
            return (
              <article
                key={s.id}
                className={`card-glow card-glow-interactive card-link p-4 ${done ? "tone-ok" : "tone-active"}`}
              >
                <h3 className="card-title">
                  <Link href={`/plans/${s.plan}`} className="card-link-main text-inherit no-underline">
                    {s.plan_title}
                  </Link>
                </h3>
                <div className="flex justify-between gap-3 text-sm mb-1">
                  <span className="text-soft">{done ? t.planAllDone : t.progress}</span>
                  <span className="text-body">{t.planProgressFmt(s.completed_count, s.day_count)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${s.plan_title} ${t.progress}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="progress-track mt-0"
                >
                  <div className="progress-fill progress-fill-tone" style={{ width: `${pct}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ListColumn>
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
  panelId,
  tabId,
}: {
  title: string;
  desc: string;
  icon: IconName;
  tone: Tone;
  plans: Plan[];
  empty: string;
  editable?: boolean;
  t: Translations;
  /** タブから開かれるときだけ渡す */
  panelId?: string;
  tabId?: string;
}) {
  return (
    <ListColumn icon={icon} tone={tone} title={title} description={desc} id={panelId} labelledBy={tabId}>
      {plans.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* 以前はカードを丸ごと <Link> で包んでいたが、それだと中の作った人を
              リンクにできなかった（リンクの入れ子は押せない）。題のリンクを
              影で引き伸ばしてカード全体を覆う形にした（card.css の .card-link）。 */}
          {plans.map((plan) => (
            <article key={plan.id} className="card-glow card-glow-interactive card-link p-4">
              <div className="flex mb-3">
                <span className={visibilityBadgeClass(plan.visibility)}>
                  {visibilityLabel(plan.visibility, t)}
                </span>
              </div>
              <h3 className="card-title">
                <Link
                  href={editable ? `/plans/${plan.id}/edit` : `/plans/${plan.id}`}
                  className="card-link-main text-inherit no-underline"
                >
                  {plan.title}
                </Link>
              </h3>
              {plan.description && <p className="card-summary">{plan.description}</p>}
              {/* 灰色の箱を横に並べるのをやめ、翻訳カードと同じ明細に揃える。 */}
              <dl className="meta-rows">
                <dt>{t.cardPlanOwner}</dt>
                <dd>
                  <Link href={`/profile/${plan.owner_username}`}>{plan.owner_username}</Link>
                </dd>
                <dt>{t.cardPlanDays}</dt>
                <dd>{t.planDayCount(plan.day_count)}</dd>
                {plan.reader_count > 0 && (
                  <>
                    <dt>{t.cardPlanReaders}</dt>
                    <dd>{t.cardReaderValue(plan.reader_count)}</dd>
                  </>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </ListColumn>
  );
}
