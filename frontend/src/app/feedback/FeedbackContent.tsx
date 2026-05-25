"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

type Channel = { heading: string; body: string; href: string; cta: string };
type Content = {
  title: string;
  intro: string;
  channels: Channel[];
  reportHeading: string;
  reportBody: string;
  back: string;
};

const REPO_URL = "https://github.com/yuki-matsuno-525/NeON-Church";

const content: Record<string, Content> = {
  ja: {
    title: "フィードバック",
    intro:
      "ご意見・不具合報告・機能要望をお寄せください。本サービスはベータ版で、皆さまのフィードバックを反映しながら改善しています。",
    channels: [
      {
        heading: "不具合・機能要望（GitHub Issues）",
        body: "再現手順や期待する動作を添えてご報告ください。返信に時間をいただく場合があります。",
        href: `${REPO_URL}/issues`,
        cta: "Issue を作成する",
      },
      {
        heading: "議論・質問（GitHub Discussions）",
        body: "「こんな機能はどうか」「他のユーザーはどう使っているか」など、軽い議論はこちらへ。",
        href: `${REPO_URL}/discussions`,
        cta: "Discussions を見る",
      },
    ],
    reportHeading: "コンテンツの通報",
    reportBody:
      "コミュニティガイドラインに反する投稿を見つけた場合は、各コメントの「報告」メニューから運営にお知らせください（要ログイン）。フィードバックページは一般的なご意見・ご要望用で、通報はコメントごとの仕組みをご利用ください。",
    back: "← トップへ戻る",
  },
  en: {
    title: "Feedback",
    intro:
      "We welcome your feedback, bug reports, and feature requests. The Service is in beta and improves based on input from people like you.",
    channels: [
      {
        heading: "Bugs and Feature Requests (GitHub Issues)",
        body: "Please include reproduction steps and the behavior you expected. Responses may take some time.",
        href: `${REPO_URL}/issues`,
        cta: "Open an issue",
      },
      {
        heading: "Discussions and Questions (GitHub Discussions)",
        body: "Use Discussions for lighter topics like \"What about feature X?\" or \"How are others using this?\".",
        href: `${REPO_URL}/discussions`,
        cta: "Browse Discussions",
      },
    ],
    reportHeading: "Reporting Content",
    reportBody:
      "If you see content that violates the Community Guidelines, please use the \"Report\" menu on the comment (sign-in required). The Feedback page is for general comments and requests; please use the per-comment report flow for content reports.",
    back: "← Back to home",
  },
};

export function FeedbackContent() {
  const { lang } = useLang();
  const c = content[lang] ?? content.en;
  return (
    <div style={{ maxWidth: "min(72ch, 100%)", margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, fontFamily: '"Noto Serif JP", serif' }}>{c.title}</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
        {c.intro}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {c.channels.map((ch) => (
          <div
            key={ch.href}
            style={{
              padding: "20px 22px",
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--bg-alt)",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginTop: 0, marginBottom: 8 }}>
              {ch.heading}
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: "0 0 12px", color: "var(--text)" }}>
              {ch.body}
            </p>
            <a
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                color: "var(--accent)",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              {ch.cta} →
            </a>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
          {c.reportHeading}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
          {c.reportBody}
        </p>
      </div>

      <div style={{ marginTop: 40 }}>
        <Link
          href="/"
          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}
        >
          {c.back}
        </Link>
      </div>
    </div>
  );
}
