# Phase 2 — バックエンド基盤

## 概要

横断的関心事（ロギング・request_id 追跡・ヘルスチェック・抽象基底モデル）を整備した。
後続フェーズで追加するすべてのモデルは `BaseModel` を継承し、すべてのログには `request_id` が自動付与される。

---

## 作成・変更ファイル一覧

```
backend/
├── common/                        ← 新規作成
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                  ← 抽象基底モデル（BaseModel）
│   ├── logging.py                 ← JSON フォーマッター・機密情報マスキング・RequestIdFilter
│   ├── middleware.py              ← request_id 付与ミドルウェア
│   ├── views.py                   ← /healthz エンドポイント
│   └── urls.py
│
├── config/
│   ├── settings/
│   │   ├── base.py                ← LOCAL_APPS・MIDDLEWARE・LOGGING を追加
│   │   └── dev.py                 ← LOGGING の root/django レベルを DEBUG に変更
│   └── urls.py                    ← healthz/ を有効化
│
└── pytest.ini                     ← 既存（変更なし）
```

---

## 実装内容

### 抽象基底モデル（`common/models.py`）

```python
class BaseModel(models.Model):
    id         = UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    class Meta:
        abstract = True
```

Phase 3 以降のすべてのモデルはこれを継承する。連番 ID を使わない理由は、外部に ID を公開したときに件数が推測されるのを防ぐため。

---

### JSON 構造化ロギング（`common/logging.py`）

**マスキング対象:**

| パターン | 例 |
|---------|-----|
| `"password": "..."` 系 JSON フィールド | パスワード変更 API のリクエストボディ |
| `"token" / "access" / "refresh"` 系 JSON フィールド | JWT トークン |
| `Authorization: Bearer ...` ヘッダ | DRF の認証ヘッダ |
| `Cookie: ...` ヘッダ | HTTP-only Cookie |
| メールアドレス | `user@example.com` → `***@***.***` |

コメント本文はビュー層でログ出力しない方針のため、ここではマスク対象外。

**出力フォーマット:**
```json
{
  "timestamp": "2026-05-04T13:16:26.123456+00:00",
  "level": "INFO",
  "logger": "django.request",
  "message": "GET /healthz/",
  "module": "basehttp",
  "line": 137,
  "request_id": "72c6f607-716c-43b7-a3db-d3188a9e2306"
}
```

---

### request_id ミドルウェア（`common/middleware.py`）

- ミドルウェアスタックの**最外層**に配置（SecurityMiddleware より前）
- `X-Request-Id` リクエストヘッダがあればそれを使用、なければ UUID4 を生成
- 生成した request_id を以下の3箇所に伝播:
  1. `request.request_id`（ビュー内で参照可能）
  2. スレッドローカル（`common.logging`）→ ログに自動付与
  3. `sentry_sdk.set_tag("request_id", ...)` → Sentry エラーとログを紐づける

---

### ヘルスチェック（`common/views.py`）

- `GET /healthz/` → `{"status": "ok", "db": true}` / 200
- DB 接続不可時 → `{"status": "degraded", "db": false}` / 503
- `permission_classes = [AllowAny]`（認証不要）

動作確認済み:
```
HTTP/1.1 200 OK
X-Request-Id: 72c6f607-716c-43b7-a3db-d3188a9e2306
{"status": "ok", "db": true}
```

---

### settings 変更

**base.py に追加:**
- `LOCAL_APPS = ["common"]`
- `MIDDLEWARE` 先頭に `"common.middleware.RequestIdMiddleware"`
- `LOGGING`（JSON フォーマッター + RequestIdFilter）

**dev.py の変更:**
- 旧: LOGGING 辞書を完全上書き（プレーンテキスト出力）
- 新: `LOGGING["root"]["level"] = "DEBUG"` で base.py の設定を継承しレベルだけ変更

---

## 確認してほしいポイント

### 1. `common/middleware.py` — ミドルウェアの配置順
`RequestIdMiddleware` を `SecurityMiddleware` より前に置いている。
**理由:** SecurityMiddleware が 301 リダイレクト（HTTPS 強制）を返すケースでも、そのレスポンスに `X-Request-Id` が付与されるようにするため。
`base.py` の MIDDLEWARE リストで先頭になっているか確認してください。

### 2. `common/logging.py` — マスキングの正規表現
`_MASK_PATTERNS` の各正規表現が意図通りに動作するかを確認してほしいです。特に:
- メールアドレスパターン (`\b[A-Za-z0-9._%+\-]+@...`) が日本語ユーザー名を含む場合に誤検知しないか
- `"token"` マスクが JWT ペイロードのデコード済み文字列（`"token_type": "bearer"` 等）まで巻き込まないか

### 3. `common/logging.py` — スレッドローカルとの整合性
`threading.local()` を使って request_id を保持している。Django の開発サーバーはスレッドモデルだが、本番（Gunicorn + Gevent 等）でコルーチンを使う場合はスレッドローカルが機能しない可能性がある。**MVP では問題ないが**、本番デプロイ時（Phase 11）に Gunicorn のワーカークラスを確認してください。

### 4. `common/views.py` — healthz の DB チェック方法
`connection.ensure_connection()` は接続がなければ新規接続を試みる。接続済みの場合は何もしない。DB が起動中だが接続プールが枯渇した場合を検知できない点に注意。MVP スコープでは十分。

### 5. `config/settings/dev.py` — LOGGING の dict 変更
`from .base import *` した後に `LOGGING["root"]["level"] = "DEBUG"` で base.py の dict を直接変更している（参照渡し）。base.py の LOGGING dict が書き換わるが、Django は settings モジュールを一度だけインポートするため実害はない。気になる場合は `copy.deepcopy` でコピーしてから変更する方法もある。

---

## 動作確認手順

```bash
# 1. healthz が 200 を返すか
curl http://localhost:8000/healthz/
# → {"status":"ok","db":true}

# 2. X-Request-Id ヘッダが付与されているか
curl -I http://localhost:8000/healthz/
# → X-Request-Id: <UUID>

# 3. ログが JSON 形式になっているか（docker-compose のログを確認）
docker-compose logs backend | tail -20
# → {"timestamp": "...", "level": "...", "request_id": "..."}

# 4. カスタムリクエスト ID を渡せるか
curl -H "X-Request-Id: my-trace-id" http://localhost:8000/healthz/
# → レスポンスヘッダの X-Request-Id が "my-trace-id" になっているか確認
```

---

## 次フェーズ（Phase 3）への引き継ぎ

- Phase 3 で追加する `User` モデルは `BaseModel` を継承する
- `common.middleware.RequestIdMiddleware` は既に有効なので追加作業不要
- Phase 3 の認証 API でパスワードフィールドがログに出力されないか、マスキングの動作を合わせて確認すること
