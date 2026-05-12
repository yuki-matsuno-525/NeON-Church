# Phase 7 — ブックマーク

## 概要

節へのブックマーク機能を実装した。
投稿・一覧・削除すべて認証必須、自分のブックマークのみ操作可能。

---

## 作成・変更ファイル一覧

```
backend/
├── bookmarks/                    ← 新規作成
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                 ← Bookmark（user + verse の UniqueConstraint）
│   ├── serializers.py            ← VerseBriefSerializer（ネスト）+ BookmarkSerializer
│   ├── views.py                  ← ListCreate / Destroy
│   ├── urls.py
│   ├── admin.py
│   └── migrations/
│       └── 0001_initial.py
│
├── tests/
│   └── test_bookmarks.py         ← ブックマークテスト 11 件
│
└── config/
    ├── settings/base.py          ← LOCAL_APPS に bookmarks 追加
    └── urls.py                   ← api/ に bookmarks.urls を登録
```

---

## モデル設計（`bookmarks/models.py`）

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | UUIDField | PK |
| user | FK → User | CASCADE |
| verse | FK → Verse | CASCADE |
| created_at / updated_at | DateTimeField | 自動付与 |

`UniqueConstraint(fields=["user", "verse"])` で 1ユーザー1節1件を DB レベルで保証。
論理削除は持たない（物理削除のみ）。

---

## API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| GET | `/api/bookmarks/` | 必要 | 自分のブックマーク一覧 |
| POST | `/api/bookmarks/` | 必要 | ブックマーク追加（重複は 409） |
| DELETE | `/api/bookmarks/{id}/` | 必要（所有者のみ） | ブックマーク削除 |

---

## シリアライザ設計

### BookmarkSerializer

- `verse`（書き込み専用 UUID）と `verse_detail`（読み取り専用ネスト）を分離。
- POST 時は `verse` UUID を送り、レスポンスは `verse_detail` で節の詳細を返す。

```json
{
  "id": "uuid",
  "verse_detail": {
    "id": "uuid",
    "number": 1,
    "text": "アブラハムの子...",
    "chapter_number": 1,
    "book_name": "マタイによる福音書"
  },
  "created_at": "2026-05-04T..."
}
```

### VerseBriefSerializer

`chapter.number` と `chapter.book.name` を `source` 指定でフラットに返す。
`select_related("verse__chapter__book")` で N+1 を防止。

---

## 設計上の決断

### 重複は `perform_create` でチェックし 409 を返す

`get_or_create` を使うと重複時も 201 を返してしまう。
`exists()` で事前チェックして `ValidationError` を raise → `create()` で 409 にマップする方式にした。

競合状態（チェック後に別リクエストが先に挿入）は UniqueConstraint が最終防衛ラインとして機能する。
その場合は 500 になるが、実用上は極めてまれな状況のため許容している。

### 一覧は自分のものだけ

`get_queryset` で `filter(user=self.request.user)` を適用。
他ユーザーのブックマークは 404 ではなく 0 件リストで返す（存在確認できないようにする）。

---

## テスト結果

```
tests/test_bookmarks.py ...........  11 passed
tests/test_comments.py ....................  20 passed
tests/test_bible.py    .........     9 passed
tests/test_auth.py     .............13 passed
合計: 53 passed in 9.49s
```

---

## 確認してほしいポイント

### 1. `bookmarks/serializers.py` — verse の write_only 化

現状、`verse`（UUID）は POST リクエストに必要だが、レスポンスには含まれない（write_only）。
`verse_detail` に節の詳細が含まれるので問題ないが、
フロントエンドが verse UUID を直接レスポンスで受け取りたい場合は `write_only` を外す。

### 2. `bookmarks/views.py` — 削除のアクセス制御

他ユーザーのブックマーク ID を知っていても 403 が返る（IsOwner パーミッション）。
Comment と同様に「存在するが権限なし」として 403 を返す設計。
404 を返して存在を隠す設計に変更する場合は `get_queryset` に `filter(user=request.user)` を追加する。

### 3. ブックマーク数のカウント

現状、節ごとの総ブックマーク数を API で返していない。
将来「人気の節」ランキングを作る場合は `Verse` に `bookmark_count` を annotate で追加する。

---

## 次フェーズ（Phase 8）への引き継ぎ

- Phase 8 で通知機能を実装する
- トリガー: 自分のコメントへの返信、自分のコメントへの upvote
- `notifications` アプリを新規作成、`Notification(user, type, comment)` モデルを追加
- `config/urls.py` のコメントアウト `# path("api/", include("notifications.urls"))` を有効化する
