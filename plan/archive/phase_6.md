# Phase 6 — Upvote

## 概要

コメントへの upvote 機能を実装した。
1ユーザー1コメント1票、投票取り消し可能、vote 数順ソートに対応。

---

## 作成・変更ファイル一覧

```
backend/
├── comments/
│   ├── models.py          ← Vote モデル追加
│   ├── serializers.py     ← vote_count フィールド追加
│   ├── views.py           ← CommentUpvoteView 追加、ordering=votes 実装
│   ├── urls.py            ← /upvote/ エンドポイント追加
│   ├── admin.py           ← VoteAdmin 追加
│   └── migrations/
│       └── 0002_vote.py   ← Vote テーブル作成
│
└── tests/
    └── test_comments.py   ← Upvote テスト 8 件追加
```

---

## モデル設計（`comments/models.py`）

### Vote

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | UUIDField | PK |
| user | FK → User | CASCADE |
| comment | FK → Comment | CASCADE |
| created_at / updated_at | DateTimeField | 自動付与 |

`UniqueConstraint(fields=["user", "comment"])` で二重投票を DB レベルで防止。
投票取り消しは Vote レコードの物理削除（`is_deleted` は持たない）。

---

## API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| POST | `/api/comments/{id}/upvote/` | 必要 | upvote 追加（重複は 409） |
| DELETE | `/api/comments/{id}/upvote/` | 必要 | upvote 取り消し（未投票は 404） |

既存エンドポイントへの変更:

| メソッド | URL | 変更点 |
|---------|-----|-------|
| GET | `/api/comments/?ordering=votes` | vote 数降順に対応（`annotate(vote_count=...)` 追加） |

---

## 設計上の決断

### `ordering=votes` は常に annotate する

`get_queryset` で常に `annotate(vote_count=Count("votes"))` を付与する。
条件分岐で votes 時だけ annotate する方式より、コードがシンプルになる。
また、`CommentSerializer.get_vote_count` で `getattr(obj, "vote_count", 0)` を使うため、
POST レスポンス（annotate なし）でも `vote_count: 0` を返せる。

### 二重投票は 409 Conflict を返す

`get_or_create` で `created=False` の場合に 409 を返す。
400 Bad Request より「リクエスト自体は正しいがサーバー状態と競合している」という意味で正確。

### 投票取り消しは 204、未投票への取り消しは 404

GET で存在確認してから DELETE するのではなく、`filter(...).delete()` の削除件数で判定。
競合状態を避けつつ、1クエリで完結する。

---

## テスト結果

```
tests/test_comments.py ....................  20 passed
tests/test_bible.py    .........          9 passed
tests/test_auth.py     .............     13 passed
合計: 42 passed in 7.19s
```

新規追加テスト 8 件（`TestCommentUpvote`）:
- `test_authenticated_can_upvote` — 201
- `test_anonymous_cannot_upvote` — 401
- `test_duplicate_upvote_is_409` — 409
- `test_remove_upvote` — 204
- `test_remove_upvote_not_voted_is_404` — 404
- `test_vote_count_increments` — 2票で vote_count=2
- `test_vote_count_decrements_after_remove` — 取り消し後 vote_count=0
- `test_ordering_by_votes` — 票数の多い順に並ぶことを確認

---

## 確認してほしいポイント

### 1. `comments/views.py` — 自分のコメントに自分で投票できる

現状、自分が投稿したコメントに自分で upvote できる。
Reddit はできない設計だが、設計上どちらが好ましいか確認してほしい。
制限したい場合は `CommentUpvoteView.post` に以下を追加:

```python
if comment.user == request.user:
    return Response({"detail": "自分のコメントには投票できません。"}, status=status.HTTP_400_BAD_REQUEST)
```

### 2. `comments/serializers.py` — `my_vote` フィールドの追加

現状、API レスポンスにユーザーが既に投票済みかどうかを返す `my_vote` フィールドがない。
フロントエンドが投票ボタンの ON/OFF を表示するために必要になる可能性がある。
実装する場合は `SerializerMethodField` で `request.user` をコンテキストから取得し、
`Vote.objects.filter(user=request.user, comment=obj).exists()` で判定する。

### 3. `comments/models.py` — Vote の updated_at

Vote は作成のみで更新されないため `updated_at` は常に `created_at` と同値になる。
`BaseModel` を継承しているので自動的にフィールドが追加されているが、
Vote 専用に `BaseModel` を使わない選択肢もある（今は統一性を優先して踏襲した）。

---

## 次フェーズ（Phase 7）への引き継ぎ

- Phase 7 でブックマーク機能を実装する
- `bookmarks` アプリを新規作成し、`Bookmark(user, verse)` モデルを追加
- `config/urls.py` のコメントアウト `# path("api/", include("bookmarks.urls"))` を有効化する
