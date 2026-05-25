"use client";

import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        color: "var(--text-muted)",
        gap: 12,
      }}
    >
      {icon && (
        <div aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.7 }}>
          {icon}
        </div>
      )}
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
        {title}
      </h2>
      {description && (
        <p style={{ margin: 0, fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
