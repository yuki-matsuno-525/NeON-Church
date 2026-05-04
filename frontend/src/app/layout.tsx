import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "NeON Church",
  description: "聖書読書・コメントプラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <div style={{ display: "flex" }}>
            <Sidebar />
            <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
