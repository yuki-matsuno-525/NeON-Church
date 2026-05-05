"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard mounted pattern to avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span style={{ width: 32, height: 32, display: "inline-block" }} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 5,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "var(--text-muted)",
        fontSize: 16,
      }}
    >
      {isDark ? "☀" : "🌙"}
    </button>
  );
}
