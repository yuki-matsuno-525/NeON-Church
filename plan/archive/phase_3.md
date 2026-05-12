# Phase 3 — 認証

## 概要

JWT + HTTP-only Cookie によるステートレス認証を実装した。
登録・ログイン・ログアウト・トークンリフレッシュ（rotation あり）の4エンドポイントと、
Cookie からトークンを読み取るカスタム認証クラスを追加した。

---

## 作成・変更ファイル一覧

```
backend/
├── users/                          ← 新規作成
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                   ← User モデル（AbstractUser + UUID PK）
│   ├── authentication.py           ← CookieJWTAuthentication
│   ├── serializers.py              ← Register / Login / User シリアライザ
│   ├── views.py                    ← 登録 / ログイン / ログアウト / リフレッシュ
│   ├── urls.py
│   └── migrations/
│       └── 0001_initial.py         ← makemigrations で自動生成
│
├── tests/
│   ├── conftest.py                 ← api_client / user_payload フィクスチャ
│   └── test_auth.py                ← 認証テスト 13 件
│
└── config/
    ├── settings/
    │   └── base.py                 ← AUTH_USER_MODEL / SIMPLE_JWT / LOCAL_APPS 追加
    └── urls.py                     ← api/auth/ を有効化
```

---

## 実装内容

### User モデル（`users/models.py`）

`AbstractUser` を継承し、主キーを UUID に変更。`common.BaseModel` は AbstractUser との多重継承で `id` フィールドが競合するため使わず、同等フィールドを直接定義した。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | UUIDField | PK（自動生成） |
| username | CharField | 一意（AbstractUser が提供） |
| email | EmailField | 登録必須 |
| bio | TextField | プロフィール文（空可） |
| created_at | DateTimeField | 自動付与 |
| updated_at | DateTimeField | 自動付与 |

---

### API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| POST | `/api/auth/register/` | 不要 | ユーザー登録＋Cookie セット |
| POST | `/api/auth/login/` | 不要 | ログイン → Cookie セット |
| POST | `/api/auth/logout/` | 必要 | blacklist → Cookie 削除 |
| POST | `/api/auth/token/refresh/` | 不要（Cookie で識別） | rotation → 新 Cookie セット |

---

### Cookie 設計

| Cookie 名 | 有効期限 | HttpOnly | Secure | SameSite |
|-----------|---------|----------|--------|---------|
| access_token | 20 分 | ✓ | 本番のみ | Lax |
| refresh_token | 20 日 | ✓ | 本番のみ | Lax |

`secure=not settings.DEBUG` にしているため、ローカル（HTTP）でも動作する。

---

### CookieJWTAuthentication（`users/authentication.py`）

Cookie からトークンを取得し、認証が通ったリクエストに CSRF チェックを強制する。

```
リクエスト
  │
  ├─ access_token Cookie なし → 認証なし（AllowAny のビューはそのまま通過）
  │
  └─ access_token Cookie あり
        ├─ トークン検証失敗 → 認証なし（InvalidToken を握り潰す）
        └─ 検証成功
              ├─ CSRF チェック失敗 → 403 PermissionDenied
              └─ 成功 → (user, token) を返す
```

**設計の決断:** `enforce_csrf` は `JWTAuthentication` には存在しない（DRF の `SessionAuthentication` 固有）。DRF の実装を参考に `_CSRFCheck` ヘルパーを自前で実装した。

---

### トークンリフレッシュの rotation 処理（`users/views.py`）

simplejwt の組み込み `TokenRefreshView` はリクエストボディからトークンを受け取るため使用不可。
代わりに Cookie ベースで以下の手順を手動実装した:

1. `RefreshToken(raw_refresh)` で古いトークンを解析
2. `refresh.access_token` で新しい access token を生成
3. `refresh.blacklist()` で古い refresh token をブラックリストに追加
4. `refresh.set_jti() / set_exp() / set_iat()` で同オブジェクトを新しい refresh token として再利用
5. 両トークンを Cookie にセット

---

### settings 変更（`config/settings/base.py`）

```python
AUTH_USER_MODEL = "users.User"

THIRD_PARTY_APPS += [
    "rest_framework_simplejwt.token_blacklist",  # blacklist 機能に必要
]

LOCAL_APPS += ["users"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.CookieJWTAuthentication",  # Cookie ベースに変更
    ],
    ...
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=20),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=20),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
```

---

### テスト結果

```
tests/test_auth.py .............  13 passed in 2.85s
```

| テストクラス | テスト内容 |
|------------|---------|
| TestRegister | 登録成功・重複ユーザー名・パスワード不足/短い・メールなし |
| TestLogin | ログイン成功・誤パスワード・存在しないユーザー |
| TestLogout | ログアウト成功・未認証での呼び出し |
| TestTokenRefresh | リフレッシュ成功・Cookie なし・rotation |

---

## 確認してほしいポイント

### 1. `users/authentication.py` — CSRF 強制のタイミング

CSRF チェックは「Cookie に access_token が存在し、かつ検証に成功した」場合のみ行う。
ログイン・登録など未認証エンドポイントへのリクエストでは `raw_token is None` で早期リターンするため CSRF は強制されない。
**確認:** この挙動が意図した通りか確認してほしい。ログイン自体に CSRF を強制したい場合は、ビュー側で `@csrf_protect` を明示する必要がある（MVP では不要と判断）。

### 2. `users/views.py` — `_set_auth_cookies` の `secure` フラグ

```python
secure=not settings.DEBUG
```

本番（DEBUG=False）では HTTPS 必須になる。Render にデプロイした際、HTTP → HTTPS リダイレクトを経由する最初のリクエストで Cookie がセットされない可能性があるため、Phase 11 でデプロイ後に確認すること。

### 3. `users/models.py` — email の一意制約

現状 `email` に `unique=True` を設定していない（`AbstractUser` のデフォルト）。
同じメールアドレスで複数のアカウントが作れる。MVP では許容しているが、Phase 9 あたりで追加を検討してください。

### 4. `users/views.py` — LogoutView の blacklist 失敗の握り潰し

```python
try:
    RefreshToken(raw_refresh).blacklist()
except (TokenError, AttributeError):
    pass
```

`TokenError` は「既に無効なトークン」、`AttributeError` は「token_blacklist が未インストール」のケースに対応。
**確認:** 無効なトークンでのログアウトを「成功扱い（204）」にするのが意図通りか確認してほしい。悪意のあるトークンを送りつけて 204 を受け取っても攻撃者には何のメリットもないため問題ない判断。

### 5. `tests/test_auth.py` — rotation テストの制限

`test_rotation_invalidates_old_token` は「古い refresh_token を使い回すと 401 になる」ことを確認したいが、
`APIClient` がリクエストごとに Cookie を自動更新するため、「rotation 後に古いトークンを手動で送る」テストが難しい。
**確認:** この制限は既知。rotation の動作確認は Swagger UI や curl で手動検証することを推奨する（手順は下記）。

---

## 動作確認手順

```bash
# 1. ユーザー登録
curl -c cookies.txt -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'
# → 201, cookies.txt に access_token と refresh_token が保存される

# 2. ログアウト（CSRF トークンが必要）
# まず CSRF トークンを取得
curl -c cookies.txt http://localhost:8000/api/schema/
CSRF=$(grep csrftoken cookies.txt | awk '{print $7}')

curl -b cookies.txt -c cookies.txt -X POST http://localhost:8000/api/auth/logout/ \
  -H "X-CSRFToken: $CSRF"
# → 204

# 3. リフレッシュ（ログアウト後は 401 になるはず）
curl -b cookies.txt -X POST http://localhost:8000/api/auth/token/refresh/
# → 401（blacklist 済みのトークン）
```

---

## 次フェーズ（Phase 4）への引き継ぎ

- `AUTH_USER_MODEL = "users.User"` が設定済みのため、Phase 4 以降のモデルで `ForeignKey(settings.AUTH_USER_MODEL)` が使える
- `CookieJWTAuthentication` がデフォルト認証クラスになったため、認証不要な API には `permission_classes = [AllowAny]` を明示すること（Phase 4 の聖書 GET API もこれが必要）
- DB リセット済み（`docker-compose down -v` を実施）のため、開発中のデータは消えていることに注意
