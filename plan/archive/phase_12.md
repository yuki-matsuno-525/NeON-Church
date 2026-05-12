# Phase 12: E2Eテスト（Playwright）

## 実装内容

### 追加・変更ファイル

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `frontend/src/components/comments/CommentItem.tsx` | 変更 | 削除ボタン追加（自分のコメントのみ表示） |
| `frontend/playwright.config.ts` | 新規 | Playwright設定 |
| `frontend/e2e/helpers.ts` | 新規 | テストユーティリティ（ユーザー作成・ログイン） |
| `frontend/e2e/read-bible.spec.ts` | 新規 | E2E 1: 聖書本文を読む |
| `frontend/e2e/auth.spec.ts` | 新規 | E2E 2: 登録・ログイン |
| `frontend/e2e/comment.spec.ts` | 新規 | E2E 3: コメント投稿・返信・削除 |
| `frontend/package.json` | 変更 | e2e / e2e:ui / e2e:report スクリプト追加 |
| `.github/workflows/e2e.yml` | 新規 | GitHub Actions E2E ワークフロー |

---

## E2Eテスト概要

### E2E 1: 聖書本文を読む（`read-bible.spec.ts`）
- トップ `/` → `/matthew/1` リダイレクト確認
- Sidebar からマタイをクリック → `/matthew`
- 章グリッドから5章をクリック → `/matthew/5`
- h1「マタイ 第5章」の表示確認
- `sup`（節番号）が少なくとも1件表示されることを確認

### E2E 2: 登録・ログイン（`auth.spec.ts`）
- `/register` でフォーム登録 → `/matthew/1` リダイレクト + Navbarにユーザー名
- ログアウト → Navbarに「ログイン」リンク
- `/login` でログイン → `/matthew/1` リダイレクト + Navbarにユーザー名

### E2E 3: コメント投稿・返信・削除（`comment.spec.ts`）
- API でテストユーザー事前作成 → UIでログイン
- `/matthew/1` の1節クリック → CommentPanel を開く
- コメント入力・投稿 → 表示確認
- 返信ボタン → 返信入力・投稿 → ツリー表示確認
- 削除ボタン（`data-testid="delete-comment"`）→「このコメントは削除されました」確認

---

## 設計判断

### CommentItem に削除ボタンを追加した理由
E2E 3 の流れに「コメントを削除する」が含まれているが、UIに削除ボタンが存在しなかった。  
バックエンドの `deleteComment` API は Phase 5 で実装済みのため、フロントに追加した。

### Playwright の `workers: 1` にした理由
E2Eテストが実DB を共有するため並列実行するとデータ競合が起きる。シリアル実行にして安定性を優先した。

### テストユーザーのユニーク化
`Date.now()` をユーザー名に含め、テストを繰り返し実行しても衝突しないようにした。

### CIでの聖書データインポート
バックエンドを起動後に `import_gospel` コマンドを実行することで、本文データがない状態でE2Eが失敗しないようにした。

---

## 実行方法

### ローカル

```bash
# Docker Compose でバックエンド・フロントエンドを起動しておく
docker-compose up -d

# E2Eテスト実行
cd frontend
npm run e2e

# ブラウザUIで実行（デバッグ時）
npm run e2e:ui
```

### CI

GitHub Actions の `e2e.yml` が push / PR 時に自動実行される。

---

## 確認ポイント

- [ ] E2E 1: `/matthew/5` の h1 と `sup` が表示される
- [ ] E2E 2: 登録・ログアウト・ログインの全フロー
- [ ] E2E 3: コメント投稿 → 返信 → 削除の全フロー
- [ ] CommentPanel が節クリックで開くこと（セレクタが `sup.first()` で正しくヒットするか）
- [ ] 削除ボタンが自分のコメントのみ表示されること（他ユーザーのコメントには表示されない）
