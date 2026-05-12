# Phase 5 — コメント

## 概要

ツリー構造・論理削除を持つコメント機能を実装した。
投稿は認証必須、閲覧は匿名可、削除は自分のコメントのみ（論理削除）。

---

## 作成・変更ファイル一覧

```
backend/
├── comments/                        ← 新規作成
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    ← Comment（parent FK + is_deleted）
│   ├── serializers.py               ← to_representation で削除済み body をマスク
│   ├── views.py                     ← ListCreate / Destroy + IsOwner 権限
│   ├── urls.py
│   ├── admin.py
│   └── migrations/
│       └── 0001_initial.py
│
├── tests/
│   ├── conftest.py                  ← auth_client / Bible フィクスチャを共通化
│   └── test_comments.py             ← コメントテスト 12 件
│
└── config/
    ├── settings/base.py             ← LOCAL_APPS に comments 追加
    └── urls.py                      ← api/ に comments.urls を登録
```

---

## モデル設計（`comments/models.py`）

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | UUIDField | PK |
| user | FK → User | CASCADE |
| verse | FK → Verse | CASCADE |
| parent | FK → self | null 可（トップレベルは null） |
| body | TextField | 論理削除時も DB に保持 |
| is_deleted | BooleanField | db_index=True |
| created_at / updated_at | DateTimeField | 自動付与 |

`parent` FK で無制限ネストのツリー構造を実現。物理削除しないため子コメントの親参照が壊れない。

---

## API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| GET | `/api/comments/?verse_id=&ordering=new` | 不要 | コメント一覧（verse/chapter/book でフィルタ） |
| POST | `/api/comments/` | 必要 | コメント投稿（編集不可） |
| DELETE | `/api/comments/{id}/` | 必要（所有者のみ） | 論理削除 |

- `ordering=votes` は Phase 6（Vote モデル追加後）で実装予定
- `verse_id / chapter_id / book_id` のいずれも未指定の場合は空リストを返す

---

## 設計上の決断

### SerializerMethodField ではなく to_representation を使う

`body` を `SerializerMethodField` にすると read-only になり POST 時に書き込めなくなる。
`to_representation` をオーバーライドする方式で、書き込み可能かつ表示時のみマスクを実現した。

### 論理削除で body を DB に保持する

`is_deleted=True` にするだけで body はそのまま DB に残す。
シリアライザの `to_representation` で「このコメントは削除されました」に差し替えて返す。
管理者は Admin 画面で削除前の body を確認できる（モデレーション用途）。

### 他人のコメント削除に 404 ではなく 403 を返す

`IsOwner` カスタムパーミッションクラスを使って `has_object_permission` で所有者チェック。
オブジェクトは全件から取得し、権限チェックで 403 を返す（404 を返すと「存在しない」と誤解される）。

### `auth_client` フィクスチャの独立化

`api_client` と `auth_client` が同一インスタンスを共有すると、「匿名クライアント」のはずが
認証済みになってしまう問題があった（pytest のフィクスチャ同一スコープ共有による）。
`auth_client` を独立した `APIClient()` を生成するフィクスチャに変更し、
`api_client` を真の匿名クライアントとして使えるようにした。

---

## テスト結果

```
tests/test_comments.py ............  12 passed
tests/test_bible.py    .........     9 passed
tests/test_auth.py     .............13 passed
合計: 34 passed in 5.65s
```

---

## 確認してほしいポイント

### 1. `comments/models.py` — 論理削除後の body 保持

現状、論理削除しても `body` の内容は DB に残る。管理者が Admin で確認できる半面、
DB への直接アクセス権がある者には内容が見える。
**確認:** この挙動が設計意図に合っているか確認してほしい。body を消したい場合は `perform_destroy` で `instance.body = ""` を追加する。

### 2. `comments/views.py` — `ordering=votes` が未実装

`ordering=votes` クエリパラメータを渡しても `new`（新しい順）と同じ結果を返す。
Phase 6 で `annotate(vote_count=Count("votes"))` を追加して対応する。

### 3. `comments/serializers.py` — parent の verse 一致バリデーション

```python
if parent and parent.verse_id != data.get("verse").pk:
    raise ValidationError(...)
```

異なる節のコメントへの返信を拒否している。意図通りか確認してほしい。
（同じ章の別節にまたがる返信を許可したい場合は削除する）

### 4. `comments/views.py` — フィルタなしで空リストを返す設計

`verse_id / chapter_id / book_id` のいずれも未指定の場合 `qs.none()` を返す。
全コメントをページネーションなしで返すのは危険なため、この仕様にした。
フロントエンドは必ず `verse_id` を付けてリクエストすること。

---

## 次フェーズ（Phase 6）への引き継ぎ

- Phase 6 で `Vote` モデルを `comments` アプリに追加する
- `ordering=votes` の実装は `CommentListCreateView.get_queryset` に以下を追加する:
  ```python
  elif ordering == "votes":
      qs = qs.annotate(vote_count=Count("votes")).order_by("-vote_count", "-created_at")
  ```
- `CommentSerializer` に `vote_count` フィールドを追加する
