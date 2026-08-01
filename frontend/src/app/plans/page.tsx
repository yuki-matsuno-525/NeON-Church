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
import { Icon, type IconName } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui";

export default function PlansPage() {
  const { user } = useAuth();
  const t = useT();
  const [publicPlans, setPublicPlans] = useState<Plan[]>([]);
  const [myPlans, setMyPlans] = useState<Plan[]>([]);
  const [reading, setReading] = useState<PlanSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      fetchPlans().then((r) => r.results).catch(() => []),
      user ? fetchPlans({ mine: true }).then((r) => r.results).catch(() => []) : Promise.resolve([]),
      user ? fetchMyPlanSubscriptions().catch(() => []) : Promise.resolve([]),
    ]).then(([published, mine, subscriptions]) => {
      if (!alive) return;
      setPublicPlans(published);
      setMyPlans(mine);
      setReading(subscriptions);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.plansTitle}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            {t.plansDesc}
          </p>
        </div>
        {user && (
          <Link href="/plans/new" style={newButtonStyle}>
            {t.planNew}
          </Link>
        )}
      </div>

      {reading.length > 0 && (
        <section style={{ ...columnStyle, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>{t.planReadingNow}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {reading.map((subscription) => (
              <Link
                key={subscription.id}
                href={`/plans/${subscription.plan}`}
                className="card-glow card-glow-interactive"
                style={{ padding: "10px 14px", textDecoration: "none", color: "inherit", fontSize: 14, fontWeight: 700 }}
              >
                {subscription.plan_title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
        {user && (
          <PlanColumn
            title={t.planMineTitle}
            desc={t.planMineDesc}
            icon="book-open"
            color="var(--accent)"
            tint="var(--accent-tint)"
            plans={myPlans}
            loading={loading}
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
          loading={loading}
          empty={t.planPublicEmpty}
        />
      </div>
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
    <section style={columnStyle}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <span style={{ ...countBadgeStyle, background: tint, color }}>{plans.length}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : plans.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "8px 2px" }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={editable ? `/plans/${plan.id}/edit` : `/plans/${plan.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="card-glow card-glow-interactive" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <span
                    className="badge"
                    style={{
                      background:
                        plan.visibility === "public" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
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
                <div style={{ display: "flex", gap: 6, fontSize: "var(--font-size-xs)", flexWrap: "wrap" }}>
                  <span style={metaPillStyle}>{plan.owner_username}</span>
                  <span style={metaPillStyle}>{t.planDayCount(plan.day_count)}</span>
                  {plan.reader_count > 0 && <span style={metaPillStyle}>{t.planReaderCount(plan.reader_count)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const columnStyle: React.CSSProperties = {
  padding: "18px 16px",
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
};

const countBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-muted)",
};

const newButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  borderRadius: 8,
  padding: "8px 18px",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
};
