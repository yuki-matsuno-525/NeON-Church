"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark">
      <AuthProvider>
        <NotificationProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
