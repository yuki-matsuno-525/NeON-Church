import Link from "next/link";
import type { Plan, PlanSubscription } from "@/lib/api";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { visibilityLabel } from "@/lib/plans";
import type { Translations } from "@/lib/i18n";
import { planUiText } from "@/components/plans/planUiText";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState } from "@/components/ui";
import { RetryButton } from "@/components/ui/RetryButton";
import { LinkTabs, ListPageHeader, TabPanel, visibilityBadgeClass } from "@/components/list";

/* ----- 一覧の切り替え -----
   以前は「読んでいるプラン」を小さな札で上に並べ、その下に「自分の」「公開」の
   2 列を置いていた。読書プランは続けることが中身なので、毎日戻ってくる
   「進行中」を最初に開く形にした。

   どのタブを見ているかは URL（?tab=）で表す。この画面はサーバー側で
   組み立てるので、ブラウザ側の状態を持てないため。URL に出るぶん、
   その場所をそのまま人に渡せるし、戻るボタンも効く。 */
const PLAN_TABS = ["reading", "done", "mine", "find"] as const;
type PlanTabKey = (typeof PLAN_TABS)[number];

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
  // 未ログインで最初に開くのは「さがす」。「進行中」を既定にすると、
  // 開いた直後に見えるのがログインの案内だけになってしまうため。
  const defaultTab: PlanTabKey = signedIn ? "reading" : "find";
  const activeTab: PlanTabKey =
    PLAN_TABS.includes(requested as PlanTabKey) ? (requested as PlanTabKey) : defaultTab;

  // 取れなかったものは null。読書中の一覧だけは、取れなくても
  // プランは読めるので黙って空にする。
  const [publicPlans, myPlans, reading] = await Promise.all([
    loadPlans("/plans/"),
    signedIn ? loadPlans("/plans/?mine=true") : [],
    signedIn ? serverFetchList<PlanSubscription>("/plan-subscriptions/").catch(() => []) : [],
  ]);
  const failed = publicPlans === null || myPlans === null;

  // 読み終わっても購読は残る（is_active が落ちるのは「やめる」を押したときだけ）ので、
  // 進行中と完了の区別は、終わった日数がプランの日数に届いたかで決める。
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
      {/* 説明文は置かない。この下にタブがあり、その中にプランが並ぶので、
          先に散文で言い直すと同じことが 3 段に重なる。 */}
      <ListPageHeader
        title={t.plansTitle}
        action={signedIn ? <Link href="/plans/new" className="cta-button">{t.planNew}</Link> : undefined}
      />

      {/* 未ログインでもタブは4つとも出す。この画面が「読んだ記録を残せる場所」
          だと先に分かるほうが、ログインする理由が伝わるため。ログインが要る
          タブは、一覧の代わりにログインの案内を出す。 */}
      <LinkTabs
        tabs={PLAN_TABS.map((key) => ({
          key,
          label: tabLabel(key),
          href: key === defaultTab ? "/plans" : `/plans?tab=${key}`,
        }))}
        active={activeTab}
        label={t.planTabsLabel}
        idPrefix="plans"
      />

      {failed ? (
        <ErrorState
          tone="warning"
          title={supplementalText.loadErrorTitle}
          message={supplementalText.loadErrorDescription}
          extraAction={<RetryButton label={t.retry} />}
        />
      ) : !signedIn && activeTab !== "find" ? (
        <SignInColumn tabKey={activeTab} t={t} />
      ) : activeTab === "reading" || activeTab === "done" ? (
        <SubscriptionColumn
          tabKey={activeTab}
          subscriptions={activeTab === "reading" ? readingNow : finished}
          empty={activeTab === "reading" ? t.planReadingEmpty : t.planDoneEmpty}
          t={t}
        />
      ) : activeTab === "mine" ? (
        <PlanColumn
          tabKey="mine"
          plans={myPlans ?? []}
          empty={t.planMineEmpty}
          editable
          // 自分のプランには下書きと限定公開が混ざるので、ここだけは印を出す。
          showVisibility
          t={t}
        />
      ) : (
        <PlanColumn
          tabKey="find"
          plans={publicPlans ?? []}
          empty={t.planPublicEmpty}
          t={t}
        />
      )}
    </div>
  );
}

/**
 * 未ログインのときに、一覧の代わりに置くログインの案内。
 *
 * ここで LoginRequiredModal を使わないのは、あれが押したときに出す覆いで
 * "use client" が付いているため。使うとこの画面ごとブラウザ側に回ってしまう。
 * EmptyState は受け取ったものを描くだけなのでサーバー側から呼べる。
 */
function SignInColumn({ tabKey, t }: { tabKey: "reading" | "done" | "mine"; t: Translations }) {
  const message =
    tabKey === "reading" ? t.planSignInReading
    : tabKey === "done" ? t.planSignInDone
    : t.planSignInMine;

  // 戻り先はサーバー側で組み立てられる（どのタブかは URL に出ているため）。
  // ログインし終わったら、押したタブへそのまま戻ってくる。
  const loginHref = `/login?from=${encodeURIComponent(`/plans?tab=${tabKey}`)}`;

  return (
    <TabPanel idPrefix="plans" tabKey={tabKey}>
      <EmptyState
        icon={<Icon name="lock" size={36} />}
        title={t.loginRequired}
        description={message}
        action={<Link href={loginHref} className="btn btn-primary">{t.loginBtn}</Link>}
      />
    </TabPanel>
  );
}

/**
 * 進行中／完了のプランの一覧。
 *
 * 以前は小さな札を横に並べるだけで、プランで一番知りたい「どこまで進んだか」が
 * 出ていなかった。翻訳カードと同じ進捗バーを持つカードにする。
 */
function SubscriptionColumn({
  tabKey, subscriptions, empty, t,
}: {
  tabKey: PlanTabKey;
  subscriptions: PlanSubscription[];
  empty: string;
  t: Translations;
}) {
  return (
    <TabPanel idPrefix="plans" tabKey={tabKey}>
      {subscriptions.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{empty}</p>
      ) : (
        subscriptions.map((s) => {
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
        })
      )}
    </TabPanel>
  );
}

/** 一覧を取る。取れなければ null を返し、呼ぶ側で「読み込めませんでした」を出す。 */
function loadPlans(path: string): Promise<Plan[] | null> {
  return serverFetchPage<Plan>(path)
    .then((page) => page.results)
    .catch(() => null);
}

function PlanColumn({
  tabKey,
  plans,
  empty,
  editable = false,
  showVisibility = false,
  t,
}: {
  tabKey: PlanTabKey;
  plans: Plan[];
  empty: string;
  editable?: boolean;
  /** 公開範囲の印を出すか。「さがす」は全部公開なので出しても何も伝わらない */
  showVisibility?: boolean;
  t: Translations;
}) {
  return (
    <TabPanel idPrefix="plans" tabKey={tabKey}>
      {plans.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{empty}</p>
      ) : (
        /* 以前はカードを丸ごと <Link> で包んでいたが、それだと中の作った人を
           リンクにできなかった（リンクの入れ子は押せない）。題のリンクを
           影で引き伸ばしてカード全体を覆う形にした（card.css の .card-link）。 */
        plans.map((plan) => (
          <article key={plan.id} className="card-glow card-glow-interactive card-link p-4">
            {showVisibility && (
              <div className="flex mb-3">
                <span className={visibilityBadgeClass(plan.visibility)}>
                  {visibilityLabel(plan.visibility, t)}
                </span>
              </div>
            )}
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
        ))
      )}
    </TabPanel>
  );
}
