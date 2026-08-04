"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionExpiredHandler } from "@/components/auth/SessionExpiredHandler";
import { useLang } from "@/contexts/LanguageContext";

/**
 * 全ページ共通の外枠のうち、ブラウザ側でしかできないところ。
 * サイドバーの開け閉めと、表示言語を <html lang> に反映する部分を持つ。
 *
 * footer は、サーバー側で組み立てたものを受け取るだけにしている。
 * ここで読み込むと、押すところが無い部品までブラウザへ送られてしまう。
 */
export function ClientLayout({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
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
      <div className="app-body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      {footer}
    </ToastProvider>
  );
}
