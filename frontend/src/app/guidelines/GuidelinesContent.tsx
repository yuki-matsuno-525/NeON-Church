"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

type Section = { heading: string; body: string };
type Content = {
  title: string;
  intro: string;
  sections: Section[];
  back: string;
};

const content: Record<string, Content> = {
  ja: {
    title: "コミュニティガイドライン",
    intro:
      "NeON Church は、聖書、外典、偽典、関連古代文献を読み、問い、共に学ぶ場です。多様な伝統や信仰背景を持つ人々が安心して参加できるよう、以下のガイドラインに沿って投稿してください。",
    sections: [
      {
        heading: "1. 敬意ある対話",
        body: "意見が異なる相手であっても、敬意をもって接してください。人格攻撃、嘲笑、見下した言葉遣いは避けてください。建設的な議論を心がけ、相手の立場を理解しようと努めてください。",
      },
      {
        heading: "2. 宗派・伝統の違いへの配慮",
        body: "聖書の解釈、正典の範囲、外典・偽典の扱いは、宗派や伝統によって大きく異なります。本サービスは特定の伝統の正しさを判定する場ではありません。「この解釈以外は誤り」「この伝統は劣っている」といった断定的な主張ではなく、根拠を示しながら自身の見解を述べてください。",
      },
      {
        heading: "3. 断定的攻撃・差別の禁止",
        body: "特定の宗派、民族、性別、性的指向、国籍、政治的立場、信仰の有無への差別的発言、攻撃的レッテル貼り、ヘイトスピーチを禁止します。違反は投稿削除・アカウント停止の対象となります。",
      },
      {
        heading: "4. 個人情報・センシティブ情報の扱い",
        body: "自分や他人の個人情報（本名、住所、電話番号、所属教会の特定情報、家族構成など）は無断で公開しないでください。深い悩みや危機的状況の相談は、本サービスは適切な専門家・支援機関の代わりにはなりません。命の危機がある場合は地域の緊急連絡先に連絡してください。",
      },
      {
        heading: "5. 引用と出典",
        body: "他者の文章、翻訳、研究を引用するときは出典を示してください。原語、写本、注解書の参照を明示することで、回答の信頼性が高まります。AI 生成テキストをそのまま投稿する場合はその旨を明記してください。",
      },
      {
        heading: "6. 通報と運営対応",
        body: "ガイドラインに反する投稿を見つけた場合は、各コメントの通報機能から運営にお知らせください。運営は通報内容を確認のうえ、必要に応じて投稿削除・警告・アカウント停止を行います。判断の透明性は重視しますが、個別判断の詳細はお伝えできない場合があります。",
      },
      {
        heading: "7. Q&A・翻訳の取り扱い",
        body: "Q&A における「ベストアンサー」は、質問者が個人的に役立ったと判断した回答であり、本サービスや特定の伝統の公式見解ではありません。共同翻訳は参加者間の協働作業であり、公開された翻訳はそのプロジェクトの参加者による暫定的な訳である旨を理解した上で読んでください。",
      },
    ],
    back: "← トップへ戻る",
  },
  en: {
    title: "Community Guidelines",
    intro:
      "NeON Church is a place to read, ask questions about, and learn from the Bible, Apocrypha, Pseudepigrapha, and related ancient texts. To make it a safe place for people from many traditions and backgrounds, please follow these guidelines.",
    sections: [
      {
        heading: "1. Respectful Dialogue",
        body: "Treat others with respect, even when you disagree. Avoid personal attacks, mockery, and condescending language. Aim for constructive discussion and try to understand the other person's perspective.",
      },
      {
        heading: "2. Respect for Differing Traditions",
        body: "Interpretations of scripture, the scope of the canon, and how to treat Apocrypha and Pseudepigrapha vary widely across traditions. This Service is not a place to rule on which tradition is correct. Rather than asserting that other interpretations are wrong or that a tradition is inferior, share your view with supporting evidence.",
      },
      {
        heading: "3. No Categorical Attacks or Discrimination",
        body: "Discriminatory speech, hostile labels, and hate speech directed at any denomination, ethnicity, gender, sexual orientation, nationality, political position, or religious stance (including no religion) are prohibited. Violations may result in content removal and account suspension.",
      },
      {
        heading: "4. Personal and Sensitive Information",
        body: "Do not publicly post personal information about yourself or others (real names, addresses, phone numbers, identifying details about your congregation, family details, etc.) without consent. The Service is not a substitute for qualified professionals when discussing crises or deep distress. If you or someone is in immediate danger, contact local emergency services.",
      },
      {
        heading: "5. Quoting and Sourcing",
        body: "Cite the source when quoting another person's writing, translation, or research. Pointing to original languages, manuscripts, and commentaries makes your answer more trustworthy. If you post AI-generated text, please disclose it.",
      },
      {
        heading: "6. Reporting and Moderation",
        body: "If you find content that violates these guidelines, use the report function on the comment to let us know. We will review the report and may remove content, issue warnings, or suspend accounts as needed. We value transparency but may not share details about individual moderation decisions.",
      },
      {
        heading: "7. About Q&A and Translations",
        body: "An \"accepted answer\" in Q&A is one the asker personally found helpful — not an official statement from the Service or any tradition. Collaborative translations are a working effort by their participants; published translations are interim work by that project's members.",
      },
    ],
    back: "← Back to home",
  },
};

export function GuidelinesContent() {
  const { lang } = useLang();
  const c = content[lang] ?? content.en;
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
