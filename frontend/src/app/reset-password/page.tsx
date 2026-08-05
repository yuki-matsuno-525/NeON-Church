"use client";

import { Suspense, useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset, type ApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui";
import styles from "../forgot-password/AuthRecovery.module.css";

const copy = {
  ja: {
    title: "新しいパスワードを設定",
    lead: "新しいパスワードを2回入力してください。",
    password: "新しいパスワード",
    confirm: "新しいパスワード（確認）",
    hint: "8文字以上で設定してください。",
    submit: "パスワードを更新",
    saving: "更新中...",
    mismatch: "パスワードが一致しません。",
    invalid: "この再設定リンクは無効か、有効期限が切れています。もう一度リンクを発行してください。",
    failed: "パスワードを更新できませんでした。もう一度お試しください。",
    success: "パスワードを更新しました。新しいパスワードでログインできます。",
    login: "ログイン画面へ",
    request: "再設定リンクを再発行",
  },
  en: {
    title: "Choose a new password",
    lead: "Enter your new password twice.",
    password: "New password",
    confirm: "Confirm new password",
    hint: "Use at least 8 characters.",
    submit: "Update password",
    saving: "Updating...",
    mismatch: "The passwords do not match.",
    invalid: "This reset link is invalid or expired. Request a new link and try again.",
    failed: "We could not update your password. Please try again.",
    success: "Your password was updated. You can now sign in with the new password.",
    login: "Go to sign in",
    request: "Request another reset link",
  },
} as const;

function ResetPasswordForm() {
  const params = useSearchParams();
  const { lang } = useLang();
  const text = copy[lang];
  const passwordId = useId();
  const confirmId = useId();
  const uid = params.get("uid");
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uid || !token) {
      setError(text.invalid);
      return;
    }
    if (password !== confirmation) {
      setError(text.mismatch);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset({ uid, token, new_password: password });
      setComplete(true);
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(
        apiError.status === 400
          ? apiError.message?.toLowerCase().includes("invalid or expired")
            ? text.invalid
            : apiError.message || text.failed
          : text.failed,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.card} aria-labelledby="password-reset-confirm-title">
        <h1 id="password-reset-confirm-title">{text.title}</h1>
        {complete ? (
          <>
            <p role="status" aria-live="polite" className={`${styles.message} mt-6`}>{text.success}</p>
            <Link className={styles.back} href="/login">{text.login}</Link>
          </>
        ) : !uid || !token ? (
          <>
            <p role="alert" className={`${styles.message} ${styles.error} mt-6`}>{text.invalid}</p>
            <Link className={styles.back} href="/forgot-password">{text.request}</Link>
          </>
        ) : (
          <>
            <p className={styles.lead}>{text.lead}</p>
            <form className={styles.form} onSubmit={submit} aria-busy={busy}>
              <div className={styles.field}>
                <label htmlFor={passwordId}>{text.password}</label>
                <PasswordField id={passwordId} value={password} onChange={setPassword} autoComplete="new-password" minLength={8} required inputClassName="form-control" />
                <span className="text-xs text-faint">{text.hint}</span>
              </div>
              <div className={styles.field}>
                <label htmlFor={confirmId}>{text.confirm}</label>
                <PasswordField id={confirmId} value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={8} required inputClassName="form-control" />
              </div>
              <Button type="submit" loading={busy} className="w-full">{busy ? text.saving : text.submit}</Button>
              {error && <p role="alert" aria-live="polite" className={`${styles.message} ${styles.error}`}>{error}</p>}
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className={styles.shell} />}><ResetPasswordForm /></Suspense>;
}
