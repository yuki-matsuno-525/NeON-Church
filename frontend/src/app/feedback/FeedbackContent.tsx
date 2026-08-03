"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { FeedbackCategory, sendFeedback } from "@/lib/apiClient";

const REPO_URL = "https://github.com/yuki-matsuno-525/NeON-Church";
const CONTACT_EMAIL = "yuki.matsuno525@gmail.com";

const copy = {
  ja: {
    title: "フィードバック",
    intro: "ご意見、不具合報告、機能のご要望をこちらから送信できます。ログインや GitHub アカウントは不要です。",
    formTitle: "運営に送る",
    category: "種類",
    categories: {
      feedback: "ご意見・ご感想",
      bug: "不具合",
      feature: "機能の要望",
      privacy: "プライバシーに関する連絡",
      other: "その他",
    },
    email: "返信先メールアドレス（任意）",
    emailHint: "返信が必要な場合にのみ使用します。",
    page: "該当ページのURL（任意）",
    message: "内容",
    messageHint: "10〜4,000文字。個人情報やパスワードは入力しないでください。",
    submit: "送信する",
    sending: "送信中…",
    sent: "送信しました。ご協力ありがとうございます。",
    failed: "送信できませんでした。時間をおいて再試行するか、メールをご利用ください。",
    fallback: "別の連絡方法",
    emailCta: "メールで送る",
    issuesCta: "GitHub Issues を開く（新しいタブ）",
    reportTitle: "投稿内容の通報",
    reportBody: "コミュニティガイドラインに反する投稿は、各コメントの「通報」メニューをご利用ください。",
    back: "← トップへ戻る",
  },
  en: {
    title: "Feedback",
    intro: "Send feedback, bug reports, or feature requests here. No sign-in or GitHub account is required.",
    formTitle: "Send to the team",
    category: "Category",
    categories: {
      feedback: "General feedback",
      bug: "Bug report",
      feature: "Feature request",
      privacy: "Privacy request",
      other: "Other",
    },
    email: "Reply-to email (optional)",
    emailHint: "Used only when a response is needed.",
    page: "Relevant page URL (optional)",
    message: "Message",
    messageHint: "10–4,000 characters. Do not include passwords or sensitive personal data.",
    submit: "Send feedback",
    sending: "Sending…",
    sent: "Sent. Thank you for helping us improve.",
    failed: "We could not send this. Try again later or use email instead.",
    fallback: "Other contact options",
    emailCta: "Send an email",
    issuesCta: "Open GitHub Issues (new tab)",
    reportTitle: "Reporting content",
    reportBody: "For content that violates the Community Guidelines, use the Report menu on that comment.",
    back: "← Back to home",
  },
} as const;

export function FeedbackContent() {
  const { lang } = useLang();
  const c = copy[lang === "ja" ? "ja" : "en"];
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [email, setEmail] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<"idle" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setIsSending(true);
    setResult("idle");
    try {
      await sendFeedback({
        category,
        email: email.trim() || undefined,
        page_url: pageUrl.trim() || undefined,
        message: message.trim(),
        website,
      });
      setMessage("");
      setResult("sent");
    } catch {
      setResult("error");
    } finally {
      setIsSending(false);
    }
  }

  // 入力欄の見た目は globals.css の .form-control が持つ
  const isSubmitDisabled = isSending || message.trim().length < 10;

  return (
    <div className="content-page">
      <h1 className="mb-3">{c.title}</h1>
      <p className="mb-8 text-sm leading-reading text-muted">
        {c.intro}
      </p>

      <form onSubmit={submit} aria-describedby="feedback-result" className="grid gap-6">
        <h2 className="m-0">{c.formTitle}</h2>
        <div className="grid gap-2">
          <label htmlFor="feedback-category" className="font-bold">{c.category}</label>
          <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} className="form-control">
            {(Object.keys(c.categories) as FeedbackCategory[]).map((value) => (
              <option key={value} value={value}>{c.categories[value]}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="feedback-email" className="font-bold">{c.email}</label>
          <input id="feedback-email" aria-describedby="feedback-email-hint" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control" />
          <span id="feedback-email-hint" className="text-sm text-muted">{c.emailHint}</span>
        </div>
        <div className="grid gap-2">
          <label htmlFor="feedback-page" className="font-bold">{c.page}</label>
          <input id="feedback-page" type="url" inputMode="url" value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} placeholder="https://" className="form-control" />
        </div>
        {/* 自動投稿よけの隠し欄。人には見えないが、プログラムは書き込んでしまう。 */}
        <label aria-hidden="true" className="sr-only">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <div className="grid gap-2">
          <label htmlFor="feedback-message" className="font-bold">{c.message}</label>
          <textarea id="feedback-message" aria-describedby="feedback-message-hint feedback-message-count" required minLength={10} maxLength={4000} rows={8} value={message} onChange={(event) => setMessage(event.target.value)} className="form-control resize-y" />
          <span className="flex justify-between gap-3 text-sm text-muted">
            <span id="feedback-message-hint">{c.messageHint}</span><span id="feedback-message-count">{message.length}/4000</span>
          </span>
        </div>
        <button type="submit" disabled={isSubmitDisabled} className="btn btn-secondary">
          {isSending ? c.sending : c.submit}
        </button>
        {/* 送信結果。エラー色は --state-error という存在しない変数を見ていたため、
            これまで赤くならなかった。決定表の危険色に直している。 */}
        <div id="feedback-result" aria-live="polite" role={result === "error" ? "alert" : "status"} className={`min-h-6 ${result === "error" ? "text-danger" : "text-body"}`}>
          {result === "sent" ? c.sent : result === "error" ? c.failed : ""}
        </div>
      </form>

      <section aria-labelledby="feedback-fallback" className="mt-8 border-t border-border pt-6">
        <h2 id="feedback-fallback">{c.fallback}</h2>
        <div className="flex flex-wrap gap-4">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-accent">{c.emailCta}</a>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="font-bold text-accent">{c.issuesCta}</a>
        </div>
      </section>

      <section aria-labelledby="report-content" className="mt-6">
        <h2 id="report-content">{c.reportTitle}</h2>
        <p className="leading-reading">{c.reportBody}</p>
        <Link href="/guidelines" className="font-bold text-accent">Community Guidelines</Link>
      </section>

      <Link href="/" className="mt-8 font-bold text-accent">{c.back}</Link>
    </div>
  );
}
