# Phase 9 — モデレーション・セキュリティ

## 概要

コメント通報機能・管理者による強制削除・スロットリング（連続投稿制限）を実装した。
通報は 1 ユーザー 1 コメント 1 件まで、管理者のみ強制論理削除が可能。

---

## 作成・変更ファイル一覧

```
backend/
├── comments/
│   ├── models.py          ← Report モデル追加
│   ├── serializers.py     ← ReportSerializer 追加
│   ├── views.py           ← ReportView / AdminCommentModerateView 追加
│   ├── urls.py            ← /report/ / /moderate/ エンドポイント追加
│   ├── admin.py           ← ReportAdmin 追加
│   └── migrations/
│       └── 0003_report.py ← Report テーブル作成
│
├── users/
│   └── views.py           ← RegisterView / LoginView に auth スロットリング追加
│
├── tests/
│   ├── conftest.py        ← autouse で全テスト前後にキャッシュクリア追加
│   └── test_moderation.py ← 通報・管理者削除・スロットリング テスト 12 件
│
└── config/
    └── settings/base.py   ← DEFAULT_THROTTLE_RATES 追加（auth/comment_create/report）
```

---

## モデル設計（`comments/models.py`）

### Report

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | UUIDField | PK |
| reporter | FK → User | 通報者 |
| comment | FK → Comment | 通報対象コメント |
| reason | CharField | spam / offensive / misinformation / other |
| created_at / updated_at | DateTimeField | 自動付与 |

`UniqueConstraint(reporter, comment)` で同一コメントへの重複通報を防止。

---

## API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| POST | `/api/comments/{pk}/report/` | 必要 | コメント通報（重複は 409）|
| DELETE | `/api/comments/{pk}/moderate/` | is_staff 必要 | 管理者による強制論理削除 |

---

## スロットリング設定（`config/settings/base.py`）

```python
"DEFAULT_THROTTLE_RATES": {
    "auth": "5/min",           # login / register
    "comment_create": "10/min",
    "report": "5/min",
}
```

| スコープ | 対象ビュー | レート |
|---------|-----------|--------|
| auth | RegisterView / LoginView | 5/min |
| comment_create | CommentListCreateView (POST) | 10/min |
| report | ReportView | 5/min |

---

## 設計上の決断

### スロットリングは ScopedRateThrottle を採用

グローバルスロットルよりも用途別にレートを細かく制御できる。
`throttle_scope` を各 View に付与することで、認証・投稿・通報をそれぞれ独立して制限。

### 管理者削除は is_staff 権限チェック（IsAdminUser）

専用の権限クラスを作らず、Django 標準の `IsAdminUser` で充足。
is_staff を付与された管理者が Admin 画面からもコメント削除できることと一貫性を保つ。

### 既に削除済みのコメントを moderate しても 204 を返す

冪等性を確保するため、`is_deleted=True` 済みでも 204 で返す。
二重削除でエラーを出すより、管理者の誤操作に対して安全。

### テストのスロットリング上書きは monkeypatch を使用

DRF の `SimpleRateThrottle.THROTTLE_RATES` はクラス定義時に1度だけ評価されるため、
`settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']` を変更しても反映されない。
`monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {...})` で直接上書きする。

### conftest.py に autouse キャッシュクリアを追加

RegisterView に `auth` スロットリングを追加した結果、テストスイート全体でキャッシュが共有され
5 件目以降の登録が 429 になる問題が発生した。
`conftest.py` の `autouse=True` フィクスチャで全テスト前後にキャッシュクリアを行う。

---

## テスト結果

```
tests/test_moderation.py   ............  12 passed
tests/test_notifications.py ...........  11 passed
tests/test_bookmarks.py    ...........  11 passed
tests/test_comments.py     ....................  20 passed
tests/test_bible.py        .........     9 passed
tests/test_auth.py         .............13 passed
合計: 76 passed in 16.93s
```

---

## 確認してほしいポイント

### 1. 通報後の自動処理がない

現状、通報は Admin 画面に蓄積されるだけで自動削除・自動通知は行わない。
通報数が閾値を超えたら自動的にコメントを非表示にする仕組みが必要な場合は Phase 10 以降で対応。

### 2. スロットリングのレート設定

`auth: 5/min` / `comment_create: 10/min` / `report: 5/min` は仮の値。
本番でのユーザー動向を見ながら調整する必要がある。

### 3. セキュリティヘッダ未対応

django-csp・HSTS・X-Frame-Options 等のセキュリティヘッダは未設定。
本番デプロイ（Phase 11）のタイミングで設定予定。

---

## 次フェーズ（Phase 10）への引き継ぎ

- フロントエンド実装（Next.js App Router）
- openapi-typescript で型生成してから実装
- 聖書本文表示・コメント投稿・通知バッジ等の UI を構築
