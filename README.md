# NeON Church

聖書・外典・偽書をオンラインで読みながら、Reddit スタイルでコメント・議論できる Web サービス。

## 機能

- **聖書閲覧** — 書 → 章 → 節の階層ナビゲーション。ライト/ダークモード対応。
- **コメント** — 節・章・書それぞれにコメント投稿。ツリー返信・Upvote・編集・削除・タグ付け。
- **Q&A** — `is_qa` フラグ付きコメントを一覧表示。ベストアンサー設定・解決済みフィルタ付き。
- **全文検索** — 節テキスト・コメント本文・書名を横断検索。
- **お気に入り** — 節・コメントをブックマーク。プロフィールページで一覧表示。
- **通知** — コメントへの返信時に通知。未読バッジ表示。
- **読書継続** — 前回読んだ節を記録し、続きから読む。
- **共同翻訳** — 翻訳プロジェクトを立ち上げ、節単位で担当者を割り当てて翻訳できる。
- **プロフィール** — アバター画像・自己紹介・コメント履歴・お気に入り一覧。他ユーザーのプロフィールも公開。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js (App Router) |
| バックエンド | Django REST Framework |
| データベース | PostgreSQL |
| 認証 | JWT + HTTP-only Cookie (djangorestframework-simplejwt) |
| エラー監視 | Sentry |
| OpenAPI | drf-spectacular |
| テスト (BE) | pytest / pytest-django |
| テスト (FE) | Jest / React Testing Library |

## デプロイ構成

| サービス | プラットフォーム |
|---------|----------------|
| フロントエンド | Vercel |
| バックエンド | Render |
| データベース | Render PostgreSQL |
| Uptime 監視 | Better Stack |
| CI/CD | GitHub Actions |

## ローカル開発

### 前提

- Docker & Docker Compose がインストールされていること
- Git

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/<your-org>/NeON-Church.git
cd NeON-Church

# 環境変数ファイルを作成
cp .env.example .env
# .env の内容は基本そのままで動作する（必要に応じて編集）

# コンテナを起動（初回はビルドに数分かかる）
docker-compose up --build
```

起動後:
- フロントエンド: http://localhost:3000
- バックエンド API: http://localhost:8000
- OpenAPI スキーマ: http://localhost:8000/api/schema/swagger-ui/

### 聖書テキストのインポート

```bash
# 口語訳（4福音書）をインポート
docker-compose exec backend python manage.py import_gospel

# KJV（英語）をインポート
docker-compose exec backend python manage.py import_kjv
```

テキストデータは `text/` ディレクトリに配置してある。

### 管理ユーザーの作成

```bash
docker-compose exec backend python manage.py createsuperuser
```

Django Admin: http://localhost:8000/admin/

### コンテナの停止 / リセット

```bash
# 停止
docker-compose down

# DB ボリュームごとリセット（全データ削除）
docker-compose down -v
```

## テスト

### バックエンド

```bash
docker-compose exec backend pytest
```

### フロントエンド

```bash
cd frontend
npm test
```

## 環境変数

`.env.example` を参照。主要な変数:

| 変数名 | 説明 |
|-------|------|
| `DJANGO_SECRET_KEY` | Django シークレットキー（本番では長いランダム文字列に変更） |
| `DJANGO_DEBUG` | `True`（開発）/ `False`（本番） |
| `DJANGO_ALLOWED_HOSTS` | 許可するホスト（カンマ区切り） |
| `CSRF_TRUSTED_ORIGINS` | CSRF を許可するオリジン |
| `POSTGRES_*` | PostgreSQL 接続情報 |
| `NEXT_PUBLIC_API_BASE_URL` | フロントエンドからのバックエンド API URL |
| `SENTRY_DSN` | Sentry DSN（省略可） |

## API 概要

ベース URL: `http://localhost:8000/api/`

| エンドポイント | 説明 |
|--------------|------|
| `GET /books/` | 書一覧 |
| `GET /books/{id}/chapters/` | 章一覧 |
| `GET /chapters/{id}/verses/` | 節一覧 |
| `GET/POST /comments/` | コメント取得・投稿 |
| `POST /comments/{id}/upvote/` | Upvote |
| `GET/POST /bookmarks/` | お気に入り一覧・登録 |
| `GET /notifications/` | 通知一覧 |
| `GET /search/?q=...` | 全文検索 |
| `GET /qa/` | Q&A コメント一覧 |
| `GET/POST /translations/` | 翻訳プロジェクト一覧・作成 |
| `POST /auth/register/` | ユーザー登録 |
| `POST /auth/login/` | ログイン |
| `POST /auth/logout/` | ログアウト |
| `GET /auth/me/` | ログイン中ユーザー情報 |
| `GET /users/{username}/` | 他ユーザープロフィール |

完全なスキーマは `/api/schema/swagger-ui/` で確認できる。

## プロジェクト構成

```
NeON-Church/
├── backend/             # Django REST Framework
│   ├── bible/           # 書・章・節モデル、検索
│   ├── comments/        # コメント・タグ・Upvote・Q&A
│   ├── bookmarks/       # お気に入り
│   ├── notifications/   # 通知
│   ├── reading_progress/# 読書継続
│   ├── translations/    # 共同翻訳プロジェクト
│   ├── users/           # 認証・プロフィール
│   ├── config/          # Django 設定・URL ルーティング
│   └── tests/           # テストスイート
├── frontend/            # Next.js
│   └── src/
│       ├── app/         # App Router ページ
│       ├── components/  # UI コンポーネント
│       ├── contexts/    # AuthContext・ThemeContext
│       ├── hooks/       # useComments 等カスタムフック
│       └── lib/         # API クライアント・型定義
├── text/                # 聖書テキストデータ（インポート用）
├── plan/                # 設計ドキュメント
│   ├── spec.md          # サービス仕様
│   ├── additional_phases.md # 実装フェーズ一覧（Phase 13〜22）
│   ├── ui_spec.md       # UI 仕様・デザイントークン
│   ├── test_plan.md     # テスト設計
│   └── archive/         # 完了済みフェーズメモ
└── docker-compose.yml
```

## 認証フロー

1. `POST /api/auth/login/` でアクセストークン（20分）とリフレッシュトークン（20日）を HTTP-only Cookie にセット
2. 以降のリクエストは Cookie を自動送信
3. アクセストークン期限切れ時は自動でリフレッシュ（refresh token rotation）
4. ログアウト時は Cookie 削除 + リフレッシュトークン失効

## ライセンス

Private
