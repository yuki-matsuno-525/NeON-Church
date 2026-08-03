"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  deleteAccount,
  fetchAccountSettings,
  fetchSessions,
  revokeOtherSessions,
  revokeSession,
  updateAccountIdentity,
  updateNotificationPreferences,
  type AccountSettings,
  type ApiError,
  type JwtSession,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button, ConfirmDialog, ErrorState, SkeletonList, Toggle } from "@/components/ui";
import styles from "./SettingsPage.module.css";

const copy = {
  ja: {
    title: "アカウント設定",
    lead: "ログイン情報、通知、セッションとアカウントを管理します。",
    nav: "設定セクション",
    identity: "ユーザー情報",
    identityDesc: "ユーザー名またはメールアドレスを変更するには、現在のパスワードが必要です。",
    username: "ユーザー名",
    email: "メールアドレス",
    currentPassword: "現在のパスワード",
    saveIdentity: "ユーザー情報を保存",
    identitySaved: "ユーザー情報を更新しました。",
    oauthIdentity: "OAuthのみで登録したアカウントでは、パスワード確認が必要な情報をこの画面から変更できません。",
    notifications: "通知",
    notificationsDesc: "受け取りたい通知方法を選択できます。",
    emailNotifications: "メール通知",
    emailNotificationsDesc: "重要なアクティビティを登録メールアドレスで受け取ります。",
    inAppNotifications: "アプリ内通知",
    inAppNotificationsDesc: "NeON Church内の通知一覧にアクティビティを表示します。",
    saveNotifications: "通知設定を保存",
    notificationsSaved: "通知設定を更新しました。",
    password: "パスワード",
    passwordDesc: "変更すると他のすべての更新トークンが失効し、この端末に新しいセッションが発行されます。",
    newPassword: "新しいパスワード",
    confirmPassword: "新しいパスワード（確認）",
    passwordHint: "8文字以上で設定してください。",
    passwordMismatch: "新しいパスワードが一致しません。",
    changePassword: "パスワードを変更",
    passwordChanged: "パスワードを変更し、他のセッションを無効にしました。",
    oauthPassword: "このアカウントはOAuthでログインしています。パスワード変更は利用できません。",
    sessions: "ログイン中のセッション",
    sessionsDesc: "有効な更新トークンを確認し、不要なセッションを無効にできます。",
    currentSession: "現在のセッション",
    otherSession: "別のセッション",
    issued: "開始",
    expires: "有効期限",
    revoke: "無効にする",
    revokeOthers: "他のセッションをすべて無効にする",
    revokeTitle: "セッションを無効にしますか？",
    revokeDesc: "対象の端末では、アクセストークンの期限後に再ログインが必要になります。",
    revokeOthersTitle: "他のセッションをすべて無効にしますか？",
    revokeOthersDesc: "現在の端末以外で再ログインが必要になります。",
    sessionRevoked: "セッションを無効にしました。",
    noSessions: "有効なセッションはありません。",
    danger: "アカウント削除",
    dangerDesc: "投稿を含む関連データが削除される可能性があります。この操作は取り消せません。",
    confirmUsername: "確認のためユーザー名を入力",
    deleteAccount: "アカウントを削除",
    deleteTitle: "アカウントを完全に削除しますか？",
    deleteDesc: "この操作は取り消せません。入力内容を確認して削除してください。",
    deleteConfirm: "完全に削除",
    cancel: "キャンセル",
    save: "保存中...",
    loadFailed: "設定を読み込めませんでした",
    loadFailedDesc: "通信状態を確認して、もう一度お試しください。",
    retry: "再試行",
    actionFailed: "操作に失敗しました。もう一度お試しください。",
  },
  en: {
    title: "Account settings",
    lead: "Manage your sign-in details, notifications, sessions, and account.",
    nav: "Settings sections",
    identity: "Account details",
    identityDesc: "Your current password is required to change your username or email address.",
    username: "Username",
    email: "Email address",
    currentPassword: "Current password",
    saveIdentity: "Save account details",
    identitySaved: "Your account details were updated.",
    oauthIdentity: "Accounts created only through OAuth cannot change password-protected details here.",
    notifications: "Notifications",
    notificationsDesc: "Choose how you want to receive notifications.",
    emailNotifications: "Email notifications",
    emailNotificationsDesc: "Receive important activity at your registered email address.",
    inAppNotifications: "In-app notifications",
    inAppNotificationsDesc: "Show activity in your NeON Church notification list.",
    saveNotifications: "Save notification preferences",
    notificationsSaved: "Your notification preferences were updated.",
    password: "Password",
    passwordDesc: "Changing it revokes every existing refresh session and issues a new session on this device.",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint: "Use at least 8 characters.",
    passwordMismatch: "The new passwords do not match.",
    changePassword: "Change password",
    passwordChanged: "Your password was changed and other sessions were revoked.",
    oauthPassword: "This account signs in with OAuth. Password change is unavailable.",
    sessions: "Active sessions",
    sessionsDesc: "Review active refresh tokens and revoke sessions you no longer need.",
    currentSession: "Current session",
    otherSession: "Other session",
    issued: "Started",
    expires: "Expires",
    revoke: "Revoke",
    revokeOthers: "Revoke all other sessions",
    revokeTitle: "Revoke this session?",
    revokeDesc: "That device will need to sign in again after its access token expires.",
    revokeOthersTitle: "Revoke all other sessions?",
    revokeOthersDesc: "Every device except this one will need to sign in again.",
    sessionRevoked: "The session was revoked.",
    noSessions: "There are no active sessions.",
    danger: "Delete account",
    dangerDesc: "Related data, including posts, may be deleted. This action cannot be undone.",
    confirmUsername: "Enter your username to confirm",
    deleteAccount: "Delete account",
    deleteTitle: "Permanently delete your account?",
    deleteDesc: "This cannot be undone. Check the information you entered before deleting.",
    deleteConfirm: "Delete permanently",
    cancel: "Cancel",
    save: "Saving...",
    loadFailed: "Could not load settings",
    loadFailedDesc: "Check your connection and try again.",
    retry: "Try again",
    actionFailed: "The action failed. Please try again.",
  },
} as const;

type Confirmation = { kind: "session"; id: string } | { kind: "others" } | { kind: "account" } | null;

function errorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError?.message && apiError.status !== 500 ? apiError.message : fallback;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const { lang } = useLang();
  const text = copy[lang];
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

type Text = (typeof copy)["ja"] | (typeof copy)["en"];

function IdentitySection({ settings, text, onUpdated }: { settings: AccountSettings; text: Text; onUpdated: (value: AccountSettings) => void }) {
  const passwordId = useId();
  const [username, setUsername] = useState(settings.username);
  const [email, setEmail] = useState(settings.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updateAccountIdentity({ username, email, current_password: password });
      onUpdated(updated);
      setPassword("");
      setMessage({ type: "success", text: text.identitySaved });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="identity" className={styles.section} aria-labelledby="identity-heading">
      <h2 id="identity-heading">{text.identity}</h2>
      <p className={styles.description}>{text.identityDesc}</p>
      {!settings.has_usable_password ? (
        <p className={styles.notice}>{text.oauthIdentity}</p>
      ) : (
        <form className={styles.form} onSubmit={submit} aria-busy={busy}>
          <fieldset className={`${styles.form} m-0 border-0 p-0`} disabled={busy}>
            <label className={styles.field}>
              <span>{text.username}</span>
              <input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={150} required />
            </label>
            <label className={styles.field}>
              <span>{text.email}</span>
              <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required />
            </label>
            <div className={styles.field}>
              <label htmlFor={passwordId}>{text.currentPassword}</label>
              <PasswordField id={passwordId} value={password} onChange={setPassword} autoComplete="current-password" required inputStyle={{ minHeight: 44, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg)", color: "var(--text)", font: "inherit", fontSize: 16, padding: "9px 12px" }} />
            </div>
            <div className={styles.actions}><Button type="submit" loading={busy}>{text.saveIdentity}</Button></div>
          </fieldset>
          <InlineMessage message={message} />
        </form>
      )}
    </section>
  );
}

function NotificationSection({ settings, text, onUpdated }: { settings: AccountSettings; text: Text; onUpdated: (value: AccountSettings) => void }) {
  const [emailEnabled, setEmailEnabled] = useState(settings.email_notifications_enabled);
  const [inAppEnabled, setInAppEnabled] = useState(settings.in_app_notifications_enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await updateNotificationPreferences({ email_notifications_enabled: emailEnabled, in_app_notifications_enabled: inAppEnabled });
      onUpdated({ ...settings, ...result });
      setMessage({ type: "success", text: text.notificationsSaved });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="notifications" className={styles.section} aria-labelledby="notifications-heading">
      <h2 id="notifications-heading">{text.notifications}</h2>
      <p className={styles.description}>{text.notificationsDesc}</p>
      <form className={styles.form} onSubmit={submit} aria-busy={busy}>
        <Toggle checked={emailEnabled} onChange={setEmailEnabled} label={text.emailNotifications} description={text.emailNotificationsDesc} disabled={busy} />
        <Toggle checked={inAppEnabled} onChange={setInAppEnabled} label={text.inAppNotifications} description={text.inAppNotificationsDesc} disabled={busy} />
        <div className={styles.actions}><Button type="submit" loading={busy}>{text.saveNotifications}</Button></div>
        <InlineMessage message={message} />
      </form>
    </section>
  );
}

function PasswordSection({ settings, text, onChanged }: { settings: AccountSettings; text: Text; onChanged: () => void }) {
  const currentId = useId();
  const newId = useId();
  const confirmId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: text.passwordMismatch });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
      setMessage({ type: "success", text: text.passwordChanged });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="password" className={styles.section} aria-labelledby="password-heading">
      <h2 id="password-heading">{text.password}</h2>
      <p className={styles.description}>{text.passwordDesc}</p>
      {!settings.has_usable_password ? (
        <p className={styles.notice}>{text.oauthPassword}</p>
      ) : (
        <form className={styles.form} onSubmit={submit} aria-busy={busy}>
          <fieldset className={`${styles.form} m-0 border-0 p-0`} disabled={busy}>
            <PasswordInput id={currentId} label={text.currentPassword} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordInput id={newId} label={text.newPassword} value={newPassword} onChange={setNewPassword} autoComplete="new-password" hint={text.passwordHint} />
            <PasswordInput id={confirmId} label={text.confirmPassword} value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            <div className={styles.actions}><Button type="submit" loading={busy}>{text.changePassword}</Button></div>
          </fieldset>
          <InlineMessage message={message} />
        </form>
      )}
    </section>
  );
}

function PasswordInput({ id, label, value, onChange, autoComplete, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: "current-password" | "new-password"; hint?: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <PasswordField id={id} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={autoComplete === "new-password" ? 8 : undefined} inputStyle={{ minHeight: 44, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg)", color: "var(--text)", font: "inherit", fontSize: 16, padding: "9px 12px" }} />
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}

function SessionsSection({ text, reloadToken, onCurrentRevoked }: { text: Text; reloadToken: number; onCurrentRevoked: () => void }) {
  const { lang } = useLang();
  const [sessions, setSessions] = useState<JwtSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchSessions()
      .then(setSessions)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetchSessions()
      .then((items) => {
        if (active) setSessions(items);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const confirm = async () => {
    const target = confirmation;
    if (!target) return;
    setConfirmation(null);
    setBusy(true);
    setMessage(null);
    try {
      if (target.kind === "session") {
        const current = sessions.find((session) => session.id === target.id)?.current;
        await revokeSession(target.id);
        if (current) {
          onCurrentRevoked();
          return;
        }
      } else if (target.kind === "others") {
        await revokeOtherSessions();
      }
      setMessage({ type: "success", text: text.sessionRevoked });
      load();
    } catch (caught) {
      setMessage({ type: "error", text: errorMessage(caught, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  const date = (value: string) => new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return (
    <section id="sessions" className={styles.section} aria-labelledby="sessions-heading" aria-busy={busy || loading}>
      <h2 id="sessions-heading">{text.sessions}</h2>
      <p className={styles.description}>{text.sessionsDesc}</p>
      {loading ? <SkeletonList count={2} /> : error ? (
        <ErrorState title={text.loadFailed} message={text.loadFailedDesc} retryLabel={text.retry} onRetry={load} />
      ) : sessions.length === 0 ? (
        <p className={styles.notice}>{text.noSessions}</p>
      ) : (
        <ul className={styles.sessionList}>
          {sessions.map((session) => (
            <li key={session.id} className={styles.session}>
              <div>
                <p className={styles.sessionTitle}>{session.current ? text.currentSession : text.otherSession}</p>
                <p className={styles.sessionMeta}>{text.issued}: {date(session.created_at)}<br />{text.expires}: {date(session.expires_at)}</p>
              </div>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmation({ kind: "session", id: session.id })}>{text.revoke}</Button>
            </li>
          ))}
        </ul>
      )}
      <div className={`${styles.actions} mt-4`}>
        <Button variant="ghost" disabled={busy || sessions.filter((session) => !session.current).length === 0} onClick={() => setConfirmation({ kind: "others" })}>{text.revokeOthers}</Button>
      </div>
      <InlineMessage message={message} />
      <ConfirmDialog
        open={confirmation?.kind === "session" || confirmation?.kind === "others"}
        title={confirmation?.kind === "others" ? text.revokeOthersTitle : text.revokeTitle}
        description={confirmation?.kind === "others" ? text.revokeOthersDesc : text.revokeDesc}
        confirmText={text.revoke}
        cancelText={text.cancel}
        destructive
        onConfirm={confirm}
        onCancel={() => setConfirmation(null)}
      />
    </section>
  );
}

function DangerSection({ settings, text, onDeleted }: { settings: AccountSettings; text: Text; onDeleted: () => void }) {
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const remove = async () => {
    setConfirmation(false);
    setBusy(true);
    setMessage(null);
    try {
      await deleteAccount(username, settings.has_usable_password ? password : undefined);
      onDeleted();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
      setBusy(false);
    }
  };

  return (
    <section id="danger" className={`${styles.section} ${styles.danger}`} aria-labelledby="danger-heading">
      <h2 id="danger-heading">{text.danger}</h2>
      <p className={styles.description}>{text.dangerDesc}</p>
      <form className={styles.form} aria-busy={busy} onSubmit={(event) => { event.preventDefault(); setConfirmation(true); }}>
        <fieldset className={`${styles.form} m-0 border-0 p-0`} disabled={busy}>
          <label className={styles.field}>
            <span>{text.confirmUsername}</span>
            <input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" required />
          </label>
          {settings.has_usable_password && (
            <div className={styles.field}>
              <label htmlFor={passwordId}>{text.currentPassword}</label>
              <PasswordField id={passwordId} value={password} onChange={setPassword} autoComplete="current-password" required inputStyle={{ minHeight: 44, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg)", color: "var(--text)", font: "inherit", fontSize: 16, padding: "9px 12px" }} />
            </div>
          )}
          <div className={styles.actions}><Button type="submit" variant="destructive" loading={busy}>{text.deleteAccount}</Button></div>
        </fieldset>
        <InlineMessage message={message} />
      </form>
      <ConfirmDialog open={confirmation} title={text.deleteTitle} description={text.deleteDesc} confirmText={text.deleteConfirm} cancelText={text.cancel} destructive onConfirm={remove} onCancel={() => setConfirmation(false)} />
    </section>
  );
}

function InlineMessage({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  if (!message) return null;
  return <p role={message.type === "error" ? "alert" : "status"} aria-live="polite" className={`${styles.message} ${message.type === "error" ? styles.error : styles.success}`}>{message.text}</p>;
}
