"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionExpiredHandler } from "@/components/auth/SessionExpiredHandler";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <SessionExpiredHandler />
      {/* 全ページ共通の背景（見た目は globals.css の .app-background 側に置いている） */}
      <div className="app-background" />
      <div className="app-background-overlay" />
      <Navbar menuOpen={sidebarOpen} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <div style={{ display: "flex", position: "relative", zIndex: 2 }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
      <Footer />
    </ToastProvider>
  );
}
