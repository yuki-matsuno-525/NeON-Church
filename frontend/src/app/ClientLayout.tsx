"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
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
      {/* 全ページ共通の背景（見た目は globals.css の .app-background 側に置いている） */}
      <div className="app-background" />
      <div className="app-background-overlay" />
      <Navbar menuOpen={sidebarOpen} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
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
