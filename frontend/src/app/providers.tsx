"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import type { Lang } from "@/contexts/LanguageContext";

/**
 * アプリ全体で共有する状態（ログイン・通知・表示言語）をまとめて渡す。
 *
 * 見た目はダーク固定。以前は next-themes でテーマを切り替えられる形にしていたが、
 * 実際には常にダークに固定しており、ライトの配色も用意していなかった。
 * 切り替えの部品は押しても何も起きないため、仕組みごと外してある
 * （方針は plan/design-review.md「ダークテーマに集中する」）。
 */
export function Providers({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
