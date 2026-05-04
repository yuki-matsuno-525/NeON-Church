# Phase 8 — 通知

## 概要

返信・upvote をトリガーとする通知機能を実装した。
自己通知はスキップ、未読フィルタ・個別既読・全既読に対応。

---

## 作成・変更ファイル一覧

```
backend/
├── notifications/                   ← 新規作成
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    ← Notification（recipient / actor / type / comment / is_read）
│   ├── serializers.py               ← NotificationSerializer
│   ├── views.py                     ← List / Read / ReadAll
│   ├── urls.py
│   ├── admin.py
│   └── migrations/
│       └── 0001_initial.py
│
├── comments/
│   └── views.py                     ← _notify() ヘルパー追加、返信・upvote 時に呼び出し
│
├── tests/
│   └── test_notifications.py        ← 通知テスト 11 件
│
└── config/
    ├── settings/base.py             ← LOCAL_APPS に notifications 追加
    └── urls.py                      ← api/ に notifications.urls を登録
```

---

## モデル設計（`notifications/models.py`）

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | UUIDField | PK |
| recipient | FK → User | 通知を受け取るユーザー |
| actor | FK → User | 通知をトリガーしたユーザー |
| notification_type | CharField | "reply" or "upvote" |
| comment | FK → Comment | 返信通知: 返信コメント / upvote 通知: いいねされたコメント |
| is_read | BooleanField | db_index=True |
| created_at / updated_at | DateTimeField | 自動付与 |

---

## API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| GET | `/api/notifications/` | 必要 | 通知一覧（新しい順）|
| GET | `/api/notifications/?unread=1` | 必要 | 未読のみ |
| POST | `/api/notifications/{id}/read/` | 必要 | 個別既読（他人の通知は 404）|
| POST | `/api/notifications/read-all/` | 必要 | 全既読 |

---

## 通知トリガー（`comments/views.py`）

```python
def _notify(recipient, actor, notification_type, comment):
    if recipient == actor:
        return  # 自己通知はスキップ
    Notification.objects.create(...)
```

| イベント | 呼び出し箇所 | recipient | comment |
|---------|------------|-----------|---------|
| 返信 | `CommentListCreateView.perform_create` | `parent.user` | 返信コメント |
| upvote | `CommentUpvoteView.post` | `comment.user` | いいねされたコメント |

---

## 設計上の決断

### 通知作成はシグナルではなくビュー側で明示的に行う

Django の `post_save` シグナルより、ビューで明示的に呼び出す方が:
- テストが書きやすい（シグナルを切ったり繋いだりしなくていい）
- 呼び出し元が一目でわかる（return の後に副作用がない）

### `notifications` → `comments` の循環インポート対策

`Notification.comment` FK は `"comments.Comment"` の文字列参照で定義。
`comments/views.py` では `_notify` 内で `from notifications.models import Notification` を遅延インポートし、起動時の循環インポートを回避。

### 既読 API は PATCH ではなく POST /read/

DRF の UpdateAPIView（PATCH）を使う場合、`is_read` 以外のフィールドも更新可能になってしまう。
`/read/` という専用エンドポイントにすることで「既読にする以外の操作」を受け付けない。

---

## テスト結果

```
tests/test_notifications.py ...........  11 passed
tests/test_bookmarks.py    ...........  11 passed
tests/test_comments.py     ....................  20 passed
tests/test_bible.py        .........     9 passed
tests/test_auth.py         .............13 passed
合計: 64 passed in 12.88s
```

---

## 確認してほしいポイント

### 1. `comments/views.py` — upvote 取り消し時に通知を削除しない

upvote 通知は作成時に1回だけ送る。
投票を取り消しても通知は残る（既読済みの通知を遡って削除するのは混乱を招くため）。
この挙動が意図通りか確認してほしい。

### 2. 削除されたコメントの通知

`comment.is_deleted=True` の場合、`comment_body_snippet` は「このコメントは削除されました」を返す。
通知自体は残り続ける（コメントを論理削除しても通知は削除されない）。

### 3. 未読数カウントの API がない

現状、フロントエンドが未読バッジを表示するためには `?unread=1` で一覧を取得して `length` を見るしかない。
専用の `GET /api/notifications/unread-count/` を追加する選択肢もある。

---

## 次フェーズ（Phase 9）への引き継ぎ

- Phase 9 でモデレーション・セキュリティ強化を実装する
- レートリミット（django-ratelimit または DRF throttling）
- 管理者専用のコメント強制削除エンドポイント
- セキュリティヘッダ（django-csp 等）の追加検討
