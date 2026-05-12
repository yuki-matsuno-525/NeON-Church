# Phase 1 — プロジェクト基盤

## 概要

Docker Compose による3サービス構成の開発環境と、Django / Next.js プロジェクトの初期化を行った。
後続フェーズで機能を積み上げられる状態（`docker-compose up` で全サービスが起動する）にすることが目標。

---

## 作成・変更ファイル一覧

```
.env.example
docker-compose.yml

backend/
├── Dockerfile
├── requirements.txt
├── manage.py
├── config/
│   ├── settings/
│   │   ├── base.py       ← 全環境共通設定
│   │   ├── dev.py        ← 開発環境設定
│   │   └── prod.py       ← 本番環境設定（Sentry 含む）
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py

frontend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── next.config.ts
└── src/app/
    ├── layout.tsx
    ├── page.tsx
    └── globals.css
```

---

## 実装内容

### Docker Compose（docker-compose.yml）

| サービス | イメージ | ポート | 備考 |
|---------|---------|-------|------|
| db | PostgreSQL 16-alpine | 5432 | ヘルスチェックあり（`pg_isready`） |
| backend | カスタム（Python 3.13-slim） | 8000 | db ヘルスチェック後に起動 |
| frontend | カスタム（Node.js 22-alpine） | 3000 | backend 起動後に起動 |

- backend は `./backend:/app` をマウント → ホットリロード対応
- frontend は `node_modules` をコンテナ側で保持（`/app/node_modules`）→ ホスト側の差異を防ぐ
- 起動コマンド: `python manage.py migrate && python manage.py runserver 0.0.0.0:8000`（開発用）

### Django settings 分割

| ファイル | 役割 |
|---------|------|
| `base.py` | SECRET_KEY・DB・REST_FRAMEWORK・drf-spectacular など全環境共通 |
| `dev.py` | DEBUG=True、ALLOWED_HOSTS="*"、コンソールログ |
| `prod.py` | DEBUG=False、HTTPS 強制、HSTS、Sentry 初期化 |

- `manage.py` のデフォルトは `config.settings.dev`
- 本番は環境変数 `DJANGO_SETTINGS_MODULE=config.settings.prod` で切り替え

### Django URL設定（config/urls.py）

現時点で有効なルート:
- `/admin/` → Django 管理画面
- `/api/schema/` → OpenAPI スキーマ（YAML）
- `/api/schema/ui/` → Swagger UI

Phase 2 以降のルート（コメントアウト済み）:
- `/healthz/`、`/api/auth/`、`/api/` など

### インストール済みパッケージ（requirements.txt）

| パッケージ | 用途 |
|-----------|------|
| Django 5.2.1 | Webフレームワーク |
| djangorestframework 3.16.0 | REST API |
| djangorestframework-simplejwt 5.5.0 | JWT認証（Phase 3 で本格設定） |
| drf-spectacular 0.28.0 | OpenAPI スキーマ自動生成 |
| psycopg2-binary 2.9.10 | PostgreSQL ドライバ |
| sentry-sdk 2.25.1 | エラー監視（prod.py で初期化） |
| python-decouple 3.8 | 環境変数管理 |
| pytest 8.3.5 + pytest-django 4.11.1 | テスト |

### Next.js

- Next.js 15 / React 19 / TypeScript 5 / Tailwind CSS 4 / App Router
- `openapi-typescript 7.13.0` 導入済み → `npm run gen:types` で型生成可能（Phase 10 で活用）
- `src/types/api.ts` への生成パスは `package.json` に定義済み

### 環境変数（.env.example）

```
DJANGO_SECRET_KEY
DJANGO_DEBUG
DJANGO_ALLOWED_HOSTS
CSRF_TRUSTED_ORIGINS
SENTRY_DSN（オプション）
POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_HOST / POSTGRES_PORT
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_SENTRY_DSN（オプション）
```

---

## 確認してほしいポイント

### 1. `docker-compose.yml` — サービス起動順序
`depends_on` + `condition: service_healthy` で db → backend → frontend の順に起動する設定。
**見てほしい箇所:** `depends_on` の `condition` が `service_healthy` になっているか。`service_started` だと DB が未起動のまま Django が起動してエラーになる。

### 2. `config/settings/prod.py` — Sentry の設定値
```python
traces_sample_rate=0.1   # 本番トラフィックの 10% のみトレース
send_default_pii=False   # PII（個人情報）を Sentry に送らない
```
**見てほしい箇所:** `send_default_pii=False` が明示されているか確認。デフォルト False だが、意図を明確にするために明示している。

### 3. `config/settings/base.py` — REST_FRAMEWORK の認証設定
Phase 3（認証）で simplejwt を使う前提で、`DEFAULT_AUTHENTICATION_CLASSES` に `JWTAuthentication` を設定している。
**見てほしい箇所:** Phase 2 の healthz エンドポイントは認証不要にする必要があるため、View 側で `permission_classes = [AllowAny]` を明示する必要がある（base.py のデフォルト設定の影響範囲を確認）。

### 4. `frontend/Dockerfile` — node_modules の扱い
```dockerfile
VOLUME ["/app/node_modules"]  # または docker-compose.yml で除外
```
**見てほしい箇所:** ホスト側の `node_modules`（Windows）がコンテナ側（Linux）に混入しないよう除外されているか。`docker-compose.yml` の volumes に `- /app/node_modules` が記述されているか確認。

### 5. `.env.example` — 実際の `.env` との乖離
`.env.example` は Git 管理、`.env` は `.gitignore` 対象。
**確認作業:** `.env` を自分で作成して `docker-compose up` が通るかテストしてください。

---

## 動作確認手順

```bash
# 1. .env を作成
cp .env.example .env
# → DJANGO_SECRET_KEY などを適切な値に編集

# 2. 起動
docker-compose up --build

# 3. 各サービスの確認
# バックエンド: http://localhost:8000/api/schema/ui/  → Swagger UI が表示されるか
# フロントエンド: http://localhost:3000              → Next.js デフォルトページが表示されるか
# DB: docker-compose exec db psql -U neon_user -d neon_church → 接続できるか
```

---

## 次フェーズ（Phase 2）への引き継ぎ

- `config/settings/base.py` の `LOCAL_APPS` リストが空 → Phase 2 で `common` アプリを追加する
- `config/urls.py` に `healthz/` のコメントアウト行がある → Phase 2 で有効化する
- `sentry_sdk.init()` は `prod.py` にあるが、`request_id` との紐付けは Phase 2 の middleware 実装後に確認できる
