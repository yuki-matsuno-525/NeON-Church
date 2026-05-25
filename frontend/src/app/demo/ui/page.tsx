"use client";

import { useState } from "react";
import {
  Skeleton,
  Spinner,
  EmptyState,
  Button,
  TextField,
  ConfirmDialog,
  useToast,
} from "@/components/ui";

export default function UIDemoPage() {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);
  const [textValue, setTextValue] = useState("");

  const section: React.CSSProperties = {
    marginBottom: 40,
    padding: 20,
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "rgba(20, 12, 50, 0.55)",
  };
  const h: React.CSSProperties = { marginTop: 0, marginBottom: 16, fontSize: 16 };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>UI Components Demo</h1>

      <section style={section}>
        <h2 style={h}>Button</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" size="sm">Small</Button>
        </div>
      </section>

      <section style={section}>
        <h2 style={h}>Skeleton</h2>
        <Skeleton width={240} />
        <div style={{ height: 8 }} />
        <Skeleton width="80%" />
        <div style={{ height: 8 }} />
        <Skeleton width="60%" />
      </section>

      <section style={section}>
        <h2 style={h}>Spinner</h2>
        <div style={{ color: "var(--accent)" }}>
          <Spinner size={24} />
        </div>
      </section>

      <section style={section}>
        <h2 style={h}>TextField</h2>
        <TextField
          label="Username"
          autoComplete="username"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          hint="任意のユーザー名を入力"
        />
        <div style={{ height: 12 }} />
        <TextField label="Email" type="email" defaultValue="invalid" error="メールアドレスの形式が正しくありません" />
      </section>

      <section style={section}>
        <h2 style={h}>EmptyState</h2>
        <EmptyState
          title="まだ何もありません"
          description="最初の項目を追加するとここに表示されます。"
          action={<Button>追加する</Button>}
        />
      </section>

      <section style={section}>
        <h2 style={h}>Toast</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={() => toast.show("情報メッセージです", { type: "info" })}>
            Info
          </Button>
          <Button onClick={() => toast.show("保存しました", { type: "success" })}>
            Success
          </Button>
          <Button onClick={() => toast.show("エラーが発生しました", { type: "error" })}>
            Error
          </Button>
        </div>
      </section>

      <section style={section}>
        <h2 style={h}>ConfirmDialog</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={() => setConfirmOpen(true)}>確認ダイアログを開く</Button>
          <Button variant="destructive" onClick={() => setDestructiveOpen(true)}>
            破壊的確認を開く
          </Button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="変更を保存しますか？"
          description="編集内容がアカウントに保存されます。"
          onConfirm={() => {
            setConfirmOpen(false);
            toast.show("保存しました", { type: "success" });
          }}
          onCancel={() => setConfirmOpen(false)}
        />
        <ConfirmDialog
          open={destructiveOpen}
          title="本当に削除しますか？"
          description="この操作は取り消せません。"
          destructive
          confirmText="削除する"
          onConfirm={() => {
            setDestructiveOpen(false);
            toast.show("削除しました", { type: "info" });
          }}
          onCancel={() => setDestructiveOpen(false)}
        />
      </section>
    </div>
  );
}
