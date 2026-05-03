# NeON-Church MVP 実装フェーズ概要

## フェーズ一覧

| # | フェーズ | 目標 | 主な作業 |
|---|---------|------|---------|
| 1 | プロジェクト基盤 | コードが動く環境を作る | Docker Compose, Django/Next.js 初期化 |
| 2 | バックエンド基盤 | 横断的関心事を整備 | ベースモデル, ロギング, Sentry, /healthz |
| 3 | 認証 | JWT + Cookie 認証を実装 | 登録/ログイン/ログアウト API, CSRF |
| 4 | 聖書本文 | 本文データを API で返せる状態 | Book/Chapter/Verse モデル, import スクリプト, GET API |
| 5 | コメント | サービスの中核機能を実装 | ツリー構造, 論理削除, コメント CRUD |
| 6 | Upvote | コメント評価機能 | Vote モデル, 二重投票防止, vote数順ソート |
| 7 | ブックマーク | 書/章/節/コメントの保存機能 | Bookmark モデル, 自分のみ取得/削除 |
| 8 | 通知 | 返信通知機能 | Notification モデル, 未読管理, 既読 API |
| 9 | モデレーション | 安全性の確保 | 連続投稿制限, 通報機能, セキュリティテスト |
| 10 | フロントエンド | Next.js で主要画面を実装 | 型生成, 認証UI, 聖書閲覧UI, コメントUI |
| 11 | CI/CD・デプロイ | 自動テスト・自動デプロイ整備 | GitHub Actions, Vercel, Render |
| 12 | E2E テスト | 主要導線の確認 | Playwright 3本（本文閲覧/認証/コメント） |

---

## 各フェーズの詳細

### Phase 1 — プロジェクト基盤

```
docker-compose.yml
├── next.js コンテナ
├── drf コンテナ
└── PostgreSQL コンテナ

backend/
└── Django プロジェクト作成
    ├── settings/base.py
    ├── settings/dev.py
    └── settings/prod.py

frontend/
└── Next.js プロジェクト作成（App Router）
```

成果物: `docker-compose up` で3サービスが起動する

---

### Phase 2 — バックエンド基盤

```
backend/common/models.py       ← UUID PK + created_at/updated_at の抽象基底モデル
backend/common/middleware.py   ← request_id 付与
backend/common/logging.py      ← JSON 構造化ログ + 機密情報マスキング
```

- Sentry 初期化（request_id で Sentry エラーとログを紐づける）
- drf-spectacular で `/api/schema/` を公開
- `/healthz` エンドポイントを実装

成果物: ログが JSON で出力され、Sentry にエラーが飛ぶ

---

### Phase 3 — 認証

```
backend/users/models.py        ← User モデル（username 一意, email, プロフィール）
backend/users/views.py         ← 登録 / ログイン / ログアウト / リフレッシュ
```

| エンドポイント | 説明 |
|--------------|------|
| `POST /api/auth/register/` | ユーザー登録 |
| `POST /api/auth/login/` | ログイン → HTTP-only Cookie にトークンをセット |
| `POST /api/auth/logout/` | Cookie 削除 + refresh token 失効 |
| `POST /api/auth/token/refresh/` | トークンリフレッシュ（rotation あり） |

- access_token: 20分、refresh_token: 20日
- 書き込み系 API のみ CSRF 必須
- **バックエンド認証テスト**をここで追加

成果物: pytest 認証テスト全通過

---

### Phase 4 — 聖書本文

```
backend/bible/models.py        ← Book / Chapter / Verse モデル
backend/bible/management/
  commands/import_gospel.py    ← 口語訳4福音書を get_or_create でインポート
```

| エンドポイント | 説明 |
|--------------|------|
| `GET /api/books/` | 書一覧（匿名可） |
| `GET /api/books/{id}/chapters/` | 章一覧 |
| `GET /api/chapters/{id}/verses/` | 節一覧（順番通り） |

- **本文・import テスト**をここで追加

成果物: `manage.py import_gospel` で4福音書が投入でき、API で取得できる

---

### Phase 5 — コメント

```
backend/comments/models.py      ← Comment モデル（parent FK でツリー, is_deleted で論理削除）
backend/comments/serializers.py ← is_deleted=True 時に body を「このコメントは削除されました」に置換
```

| エンドポイント | 説明 |
|--------------|------|
| `GET /api/comments/?{book,chapter,verse}_id=&ordering={new,votes}` | コメント一覧 |
| `POST /api/comments/` | 投稿（要認証、編集不可） |
| `DELETE /api/comments/{id}/` | 論理削除（自分のみ） |

- **コメント・論理削除テスト**をここで追加

成果物: pytest コメントテスト全通過

---

### Phase 6 — Upvote

```
backend/comments/models.py     ← Vote モデル追加（user + comment に複合ユニーク制約）
```

| エンドポイント | 説明 |
|--------------|------|
| `POST /api/comments/{id}/upvote/` | upvote（要認証、二重投票は 409） |

- コメント一覧 API に vote 数を含める
- **upvote テスト**をここで追加

成果物: 二重投票が防止でき、vote 数順ソートが機能する

---

### Phase 7 — ブックマーク

```
backend/bookmarks/models.py    ← Bookmark モデル（book / chapter / verse / comment を対象に）
```

| エンドポイント | 説明 |
|--------------|------|
| `GET /api/bookmarks/` | 自分のブックマーク一覧（要認証） |
| `POST /api/bookmarks/` | ブックマーク登録（重複は 400） |
| `DELETE /api/bookmarks/{id}/` | ブックマーク解除（自分のみ） |

- **ブックマークテスト**をここで追加

成果物: 書・章・節・コメントをブックマークでき、自分のみ参照できる

---

### Phase 8 — 通知

```
backend/notifications/models.py   ← Notification モデル（recipient, comment FK, is_read）
backend/notifications/services.py ← コメント投稿時に親コメント作者へ通知作成（自己返信は除外）
```

| エンドポイント | 説明 |
|--------------|------|
| `GET /api/notifications/` | 自分の通知一覧（要認証） |
| `PATCH /api/notifications/{id}/read/` | 既読化（自分のみ） |

- **通知テスト**をここで追加

成果物: 返信時に通知が作成され、既読管理できる

---

### Phase 9 — モデレーション & セキュリティ

```
backend/comments/throttles.py  ← 同一 IP からの連続投稿制限（DRF throttling）
backend/moderation/models.py   ← Report モデル（重複報告防止）
```

| エンドポイント | 説明 |
|--------------|------|
| `POST /api/comments/{id}/report/` | 通報（要認証） |

- Django Admin で管理者が通報確認・コメント非表示化
- **セキュリティテスト**をここで追加（CSRF, Cookie 属性, 連続投稿制限, ログマスキング）

成果物: pytest セキュリティテスト全通過

---

### Phase 10 — フロントエンド

```
frontend/
├── app/                       ← Next.js App Router ページ
│   ├── (auth)/               ← 登録・ログイン画面
│   ├── books/                ← 書一覧 → 章一覧 → 節一覧
│   ├── bookmarks/            ← ブックマーク一覧
│   └── notifications/        ← 通知一覧
├── types/api.ts              ← openapi-typescript で自動生成
└── __tests__/                ← Vitest + React Testing Library
```

- `npm run gen:types` で DRF スキーマから型を生成
- Sentry フロントエンド設定
- **フロントエンドテスト**をここで追加

成果物: フロントエンドテスト全通過、主要操作をローカルで手動確認

---

### Phase 11 — CI/CD & デプロイ

```
.github/workflows/
├── backend.yml   ← manage.py check / makemigrations --check / pytest / spectacular validate
└── frontend.yml  ← vitest / playwright（優先3本）
```

- Vercel: main push で自動デプロイ（Frontend）
- Render: `render.yaml` 設定（Backend + PostgreSQL）

成果物: GitHub Actions が緑、本番 URL でサービスが動作する

---

### Phase 12 — E2E テスト

優先3本を Playwright で実装:

| # | シナリオ | 主な操作 |
|---|---------|---------|
| E2E 1 | 聖書本文を読む | トップ → 書選択 → 章選択 → 本文・節番号表示 |
| E2E 2 | 登録・ログイン | ユーザー登録 → ログアウト → ログイン → 認証確認 |
| E2E 3 | コメント投稿・返信・削除 | ログイン → コメント → 返信 → 削除 → 論理削除確認 |

余裕があれば: E2E 4（upvote）、E2E 5（ブックマーク）

成果物: Playwright E2E 3本が CI で全通過

---

## 設計上の共通ルール

| ルール | 内容 |
|--------|------|
| Primary Key | 全モデルで UUID を使用 |
| タイムゾーン | DB は UTC 保存、表示は日本時間 |
| 論理削除 | `is_deleted` フラグのみ。物理削除しない |
| Service 層 | ビジネスロジックは `services.py` に切り出す（Celery 追加に備える） |
| ログ | コメント本文・パスワード・トークン・Cookie・メールアドレスは出力しない |
| CI/CD | テストが書けた段階で随時 GitHub Actions に組み込む |
