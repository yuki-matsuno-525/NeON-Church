"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAccountSettings, type AccountSettings } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { ErrorState, SkeletonList } from "@/components/ui";
import styles from "./SettingsPage.module.css";
import { settingsCopy } from "./settingsCopy";
import { IdentitySection } from "@/components/settings/IdentitySection";
import { NotificationSection } from "@/components/settings/NotificationSection";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { SessionsSection } from "@/components/settings/SessionsSection";
import { DangerSection } from "@/components/settings/DangerSection";



export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const { lang } = useLang();
  const text = settingsCopy[lang];
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [sessionsVersion, setSessionsVersion] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?from=/settings");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchAccountSettings()
      .then((data) => {
        if (active) {
          setSettings(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, reloadToken]);

  if (authLoading || (user && loading)) {
    return <div className={styles.page}><SkeletonList count={4} /></div>;
  }
  if (!user) return null;
  if (loadError || !settings) {
    return (
      <div className={styles.page}>
        <ErrorState
          title={text.loadFailed}
          message={text.loadFailedDesc}
          retryLabel={text.retry}
          onRetry={() => {
            setLoading(true);
            setLoadError(false);
            setReloadToken((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.lead}>{text.lead}</p>
      </header>
      <nav className={styles.nav} aria-label={text.nav}>
        <a href="#identity">{text.identity}</a>
        <a href="#notifications">{text.notifications}</a>
        <a href="#password">{text.password}</a>
        <a href="#sessions">{text.sessions}</a>
        <a href="#danger">{text.danger}</a>
      </nav>

      <IdentitySection
        settings={settings}
        text={text}
        onUpdated={(updated) => {
          setSettings(updated);
          setUser({
            id: updated.id,
            username: updated.username,
            email: updated.email,
            bio: updated.bio,
            bookmarks_visibility: updated.bookmarks_visibility,
            created_at: updated.created_at,
          });
        }}
      />
      <NotificationSection settings={settings} text={text} onUpdated={setSettings} />
      <PasswordSection settings={settings} text={text} onChanged={() => setSessionsVersion((value) => value + 1)} />
      <SessionsSection reloadToken={sessionsVersion} text={text} onCurrentRevoked={() => { setUser(null); router.replace("/login"); }} />
      <DangerSection
        settings={settings}
        text={text}
        onDeleted={() => {
          setUser(null);
          router.replace("/");
        }}
      />
    </div>
  );
}

