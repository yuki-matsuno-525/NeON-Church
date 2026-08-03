"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPlans,
  fetchMyPlanSubscriptions,
  type Plan,
  type PlanSubscription,
} from "@/lib/api";
import { visibilityLabel } from "@/lib/plans";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ErrorState, SkeletonList } from "@/components/ui";
import { planUiText } from "@/components/plans/planUiText";

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const supplementalText = planUiText(lang);
  const [publicPlans, setPublicPlans] = useState<Plan[]>([]);
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [reading, setReading] = useState<PlanSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    Promise.all([
      fetchPlans().then((response) => response.results),
      user ? fetchPlans({ mine: true }).then((response) => response.results) : Promise.resolve([]),
      user ? fetchMyPlanSubscriptions() : Promise.resolve([]),
    ])
      .then(([published, mine, subscriptions]) => {
        if (!alive) return;
        setPublicPlans(published);
        setMyPlans(mine);
        setReading(subscriptions);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, authLoading, reloadKey]);

  const pageLoading = authLoading || loading;

  return (
    <div className="page page-full">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="m-0 text-lg font-bold">{t.plansTitle}</h1>
          <p className="mt-1 mb-0 text-sm text-muted">
            {t.plansDesc}
          </p>
        </div>
        {user && (
          <Link href="/plans/new" style={newButtonStyle}>
            {t.planNew}
          </Link>
        )}
      </div>

      {!pageLoading && !error && reading.length > 0 && (
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

      {error && !pageLoading ? (
        <ErrorState
          tone="warning"
          title={supplementalText.loadErrorTitle}
          message={supplementalText.loadErrorDescription}
          retryLabel={t.retry}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <div aria-busy={pageLoading} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16, alignItems: "start" }}>
          {user && (
            <PlanColumn
              title={t.planMineTitle}
              desc={t.planMineDesc}
              icon="book-open"
              color="var(--accent)"
              tint="var(--accent-tint)"
              plans={myPlans}
              loading={pageLoading}
              empty={t.planMineEmpty}
              editable
            />
          )}
          <PlanColumn
            title={t.planPublicTitle}
            desc={t.planPublicDesc}
            icon="globe"
            color="var(--state-success)"
            tint="rgba(34,197,94,0.15)"
            plans={publicPlans}
            loading={pageLoading}
            empty={t.planPublicEmpty}
          />
        </div>
      )}
    </div>
  );
}

function PlanColumn({
  title,
  desc,
  icon,
  color,
  tint,
  plans,
  loading,
  empty,
  editable = false,
}: {
  title: string;
  desc: string;
  icon: IconName;
  color: string;
  tint: string;
  plans: Plan[];
  loading: boolean;
  empty: string;
  editable?: boolean;
}) {
  const t = useT();
  return (
    <section className="list-column">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 className="m-0 text-md font-bold">{title}</h2>
          <span className="badge badge-count" style={{ background: tint, color }}>{plans.length}</span>
        </div>
        <p className="mt-2 mb-0 text-xs text-muted">{desc}</p>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : plans.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={editable ? `/plans/${plan.id}/edit` : `/plans/${plan.id}`}
              className="no-underline text-inherit"
            >
              <div className="card-glow card-glow-interactive p-4" >
                <div className="flex justify-end mb-3">
                  <span
                    className="badge"
                    style={{
                      background: plan.visibility === "public" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                      color: plan.visibility === "public" ? "var(--state-success)" : "var(--text-muted)",
                    }}
                  >
                    {visibilityLabel(plan.visibility, t)}
                  </span>
                </div>
                <h3 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: "var(--font-size-md)", fontWeight: 700, margin: "0 0 var(--space-2)" }}>
                  {plan.title}
                </h3>
                {plan.description && (
                  <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {plan.description}
                  </p>
                )}
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
    </section>
  );
}




const newButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  borderRadius: 8,
  padding: "8px 18px",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};
