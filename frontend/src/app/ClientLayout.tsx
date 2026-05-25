"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      {/* 全ページ共通の背景（ホームページと同じ画像＋オーバーレイ） */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/img/background.png')",
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
      <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <div style={{ display: "flex", position: "relative", zIndex: 2 }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>{children}</div>
          <Footer />
        </main>
      </div>
    </ToastProvider>
  );
}
