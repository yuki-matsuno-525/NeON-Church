"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOOKS } from "@/lib/books";

export function Sidebar() {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").filter(Boolean)[0] ?? "";

  return (
    <aside
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
  );
}
