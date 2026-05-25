"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

type Section = { heading: string; body: string };
type Content = {
  title: string;
  intro: string;
  sections: Section[];
  contactLabel: string;
  back: string;
};

const content: Record<string, Content> = {
  ja: {
    title: "利用規約",
    intro:
      "本規約は、NeON Church（以下「本サービス」）の利用条件を定めるものです。本サービスはベータ版運用中で、内容は予告なく変更されることがあります。本サービスを利用された時点で、本規約に同意したものとみなします。",
    sections: [
      {
        heading: "1. アカウントとユーザー責任",
        body: "アカウントの認証情報の管理はユーザー自身の責任で行ってください。第三者による不正利用が判明した場合は速やかにご連絡ください。",
      },
      {
        heading: "2. 投稿コンテンツ",
        body: "コメント、Q&A、共同翻訳など、ユーザーが本サービス上に投稿したコンテンツの著作権はユーザーに帰属します。ユーザーは本サービスがそのコンテンツを表示・配信・保存・引用するために必要な範囲で利用することを許諾するものとします。",
      },
      {
        heading: "3. 禁止事項",
        body: "差別的・侮蔑的な発言、宗教的攻撃、誤情報の意図的な投稿、スパム、知的財産権の侵害、個人情報の無断公開、その他法令違反となる行為を禁止します。詳細はコミュニティガイドラインを参照してください。",
      },
      {
        heading: "4. サービスの停止・アカウントの削除",
        body: "本サービスは、規約違反が確認された場合や運営上必要と判断した場合、事前通知なくコンテンツの削除・アカウントの停止を行うことがあります。ユーザーはいつでも自身のアカウントを削除できます。",
      },
      {
        heading: "5. 免責",
        body: "本サービスは聖書および関連古代文献の閲覧・議論の場を提供しますが、特定の宗教的見解を支持・否定するものではありません。投稿された解釈・Q&A・翻訳は各投稿者の見解であり、本サービスの公式見解ではありません。本サービスは、信仰相談・医療相談・法的助言・緊急相談の代替ではありません。",
      },
      {
        heading: "6. 規約の変更",
        body: "本規約は必要に応じて改訂されます。重要な変更がある場合は本サービス内で告知します。",
      },
    ],
    contactLabel: "お問い合わせ",
    back: "← トップへ戻る",
  },
  en: {
    title: "Terms of Service",
    intro:
      "These Terms of Service govern your use of NeON Church (the \"Service\"). The Service is in beta and may change without prior notice. By using the Service you agree to these terms.",
    sections: [
      {
        heading: "1. Account and User Responsibility",
        body: "You are responsible for keeping your credentials secure. If you become aware of unauthorized use of your account, please contact us promptly.",
      },
      {
        heading: "2. User Content",
        body: "You retain copyright in the content you submit (comments, Q&A, collaborative translations, etc.). You grant the Service the rights necessary to display, distribute, store, and quote your content as part of operating the Service.",
      },
      {
        heading: "3. Prohibited Conduct",
        body: "Discriminatory or insulting speech, sectarian attacks, intentionally false information, spam, infringement of intellectual property, public disclosure of personal information without consent, and any other unlawful activity are prohibited. See the Community Guidelines for details.",
      },
      {
        heading: "4. Suspension and Account Deletion",
        body: "If we identify a violation of these terms or otherwise consider it necessary for operational reasons, we may remove content or suspend accounts without prior notice. You may delete your own account at any time.",
      },
      {
        heading: "5. Disclaimer",
        body: "The Service provides a place to read and discuss the Bible and related ancient texts. It does not endorse or reject any specific religious view. Interpretations, Q&A answers, and translations submitted by users represent the views of their authors, not the official position of the Service. The Service is not a substitute for pastoral, medical, legal, or emergency advice.",
      },
      {
        heading: "6. Changes to These Terms",
        body: "These terms may be updated as needed. Significant changes will be announced within the Service.",
      },
    ],
    contactLabel: "Contact",
    back: "← Back to home",
  },
};

export function TermsContent() {
  const { lang } = useLang();
  const c = content[lang] ?? content.en;
  return <PolicyLayout c={c} feedbackLabel={lang === "ja" ? "フィードバック" : "Feedback"} />;
}

function PolicyLayout({ c, feedbackLabel }: { c: Content; feedbackLabel: string }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>{c.title}</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
        {c.intro}
      </p>
      {c.sections.map((s) => (
        <div key={s.heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
            {s.heading}
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>{s.body}</p>
        </div>
      ))}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
          {c.contactLabel}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)" }}>
          <Link href="/feedback" style={{ color: "var(--accent)" }}>{feedbackLabel}</Link>
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
