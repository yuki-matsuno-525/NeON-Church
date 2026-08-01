"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import type { Lang } from "@/contexts/LanguageContext";

export function Providers({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark">
      <AuthProvider>
        <NotificationProvider>
          <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
