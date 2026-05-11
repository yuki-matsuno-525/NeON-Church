import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        NeON Church について
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 40 }}>
        聖書を読み、語り合う場所
      </p>

      <Section title="このサービスについて">
        <p>
          NeON Church は、聖書を読みながらコメント・質問・翻訳比較ができるオンラインプラットフォームです。
          一人で静かに読む時間も、他の人の視点から学ぶ時間も、どちらも大切にした設計になっています。
        </p>
      </Section>

      <Section title="主な機能">
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: 0 }}>
          <li>聖書の節・章・書へのコメント投稿と返信</li>
          <li>コメントや節のブックマーク保存</li>
          <li>読書進捗の自動記録（前回の続きから読める）</li>
          <li>コメントへの投票（upvote）</li>
          <li>通知機能（返信・upvote）</li>
        </ul>
      </Section>

      <Section title="今後の予定">
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: 0 }}>
          <li>Q&A — 聖書に関する疑問と回答の場</li>
          <li>翻訳比較 — 複数翻訳を対訳で読む</li>
          <li>コメントタグ付け・絞り込み</li>
          <li>プロフィール画像</li>
        </ul>
      </Section>

      <div style={{ marginTop: 40 }}>
        <Link
          href="/"
          style={{
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← トップへ戻る
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)" }}>
        {children}
      </div>
    </div>
  );
}
