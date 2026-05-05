"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOOKS } from "@/lib/books";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").filter(Boolean)[0] ?? "";

  return (
    <>
      {/* モバイル: Sidebar が開いているときのみオーバーレイを表示 */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            top: "var(--navbar-height)",
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 39,
          }}
        />
      )}

      <aside
        className={`sidebar${open ? " sidebar-open" : ""}`}
        style={{
          width: "var(--sidebar-width)",
          minWidth: "var(--sidebar-width)",
          background: "var(--bg-alt)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          height: "calc(100vh - var(--navbar-height))",
          position: "sticky",
          top: "var(--navbar-height)",
        }}
      >
        {BOOKS.map((meta) => {
          const isActive = currentSlug === meta.slug;
          return (
            <Link
              key={meta.slug}
              href={`/${meta.slug}`}
              onClick={onClose}
              style={{
                display: "block",
                padding: "10px 12px",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "var(--accent)" : "var(--text)",
                background: isActive ? "var(--accent-tint)" : "transparent",
              }}
            >
              {meta.short}
            </Link>
          );
        })}
      </aside>
    </>
  );
}
