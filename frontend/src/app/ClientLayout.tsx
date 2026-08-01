"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui";
import { SessionExpiredHandler } from "@/components/auth/SessionExpiredHandler";
import { useLang } from "@/contexts/LanguageContext";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang } = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ToastProvider>
      <SessionExpiredHandler />
      <a className="skip-link" href="#main-content">
        {lang === "ja" ? "本文へ移動" : "Skip to main content"}
      </a>
      {/* 全ページ共通の背景（ホームページと同じ画像＋オーバーレイ） */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/img/background.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6, 3, 20, 0.80)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <Navbar
        menuOpen={sidebarOpen}
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
      />
      <div style={{ display: "flex", position: "relative", zIndex: 2 }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main id="main-content" tabIndex={-1} style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
      <Footer />
    </ToastProvider>
  );
}
