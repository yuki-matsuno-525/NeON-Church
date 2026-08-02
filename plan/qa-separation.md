# Q&A をコメントから分離する

Q&A を「フラグの付いたコメント」ではなく、**独立したデータ**にする。あわせて Q&A の
詳細ページを作り、読書ページのサイドパネルをタブで分ける。

リリース前なので既存の質問データは捨ててよい。**分離するなら今しかない。**

---

## なぜやるか

いまの Q&A は `Comment` に `is_qa` フラグを立てているだけで、次の歪みが出ている。

- **質問がコメント一覧に混ざる。** 読書ページのコメント欄に、感想も質問も同じ列で並ぶ
  （`CommentItem.tsx` が `is_qa` のときだけバッジを足している）。
- **回答と普通の返信が区別できない。** 回答は「質問への普通の返信」なので、読書画面から
  付いた相槌もベストアンサー候補に並ぶ。
- **`Comment` に Q&A 専用の列がぶら下がっている。** `title` / `best_answer` は質問にしか
  使わないのに、全コメントが持っている。
- **一覧ページの中で読み書きが完結していて、一覧として使えない。** カードに質問全文が入り、
  展開すると回答と返信フォームまで出る（`frontend/src/app/qa/page.tsx`）。

分けると、コメントは「箇所に付く感想・議論」だけの素直なものに戻り、Q&A は Q&A の
都合（タイトル・解決済み・ベストアンサー）を自由に持てる。

---

## 決まったこと（2026-08-02 ユーザー確定）

| 論点 | 決定 |
|---|---|
| Q&A の位置づけ | `/qa` は**未回答の質問を探す索引**。読み書きは詳細ページ `/qa/[id]` で行う |
| 「回答に普通のコメントが混じる」 | 分離で自然に解消（回答は Answer にしか作れなくなる） |
| 読書ページのサイドパネル | 「コメント」「Q&A」の**タブで分ける** |
| 質問・回答への投票 | **やめる。** 未回答／解決済みで十分。後から足せる |
| 質問を栞に入れる | **今回は不要** |
| 通報 | **詳細ページに付ける**（質問・回答の両方） |

---

## 新しいデータ

新しいアプリ `backend/qa/` を作る。

### Question（質問）

| 項目 | 内容 |
|---|---|
| user | 質問した人 |
| canonical_book / chapter_number / verse_number | 箇所。訳非依存。粒度は書 / 章 / 節のいずれか |
| source_translation | 投稿時に見ていた訳のスナップショット（表示用の補助。同一性には使わない） |
| title | 題。**必須** |
| body | 本文 |
| tags | `comments.Tag` への多対多（タグはコメントと共用のまま） |
| best_answer | ベストアンサーに選ばれた Answer への FK（null 可） |
| is_deleted | 論理削除 |

箇所の持ち方・CHECK 制約は `Comment` とまったく同じにする（`comment_location_grain_valid`
と同じ形）。栞・記事もこの形なので揃う。

### Answer（回答）

| 項目 | 内容 |
|---|---|
| question | どの質問への回答か |
| user | 回答した人 |
| body | 本文 |
| is_deleted | 論理削除 |

**ネストしない。** 回答への返信は作らない（今のツリーは Q&A では使われていない）。

### 持たないもの

- 投票（Vote）— やめる決定
- 翻訳プロジェクト（`translation_project`）— Q&A は聖書本体だけ。翻訳PJ の Q&A は今も無い
- 栞 — 今回は不要の決定

---

## API

すべて `/api/qa/` 配下。

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/qa/questions/` | 質問一覧。`?book_id=` `?tag_id=` `?q=` `?answered=true\|false` `?page=` |
| GET | `/api/qa/questions/?book_slug=&chapter_number=&verse_number=` | **その箇所の質問**（サイドパネルの Q&A タブ用） |
| POST | `/api/qa/questions/` | 質問を投稿（要認証） |
| GET | `/api/qa/questions/{id}/` | 質問1件（詳細ページ用）。**今の設計に無いのでこれが要る** |
| PATCH / DELETE | `/api/qa/questions/{id}/` | 編集・論理削除（本人のみ） |
| GET | `/api/qa/questions/{id}/answers/` | 回答一覧（ページング） |
| POST | `/api/qa/answers/` | 回答を投稿（要認証） |
| PATCH / DELETE | `/api/qa/answers/{id}/` | 編集・論理削除（本人のみ） |
| PATCH | `/api/qa/questions/{id}/best-answer/` | ベストアンサーの設定・解除（質問者のみ） |
| POST | `/api/qa/questions/{id}/report/` | 通報 |
| POST | `/api/qa/answers/{id}/report/` | 通報 |

一覧の絞り込み仕様は今の `QACommentListView` をそのまま移植する（`book_id` はカンマ区切り
で複数の `Book` id を受け、`canonical_book` へ解決する）。

---

## 画面

### `/qa`（一覧）

「解決済み / 未解決」の2列ボードは**そのまま残す**。カードだけ要約に変える。

- 質問タイトル / 本文は2〜3行で省略 / 箇所 / タグ / 投稿者 / 投稿時期 / 回答件数 / 状態バッジ
- **カード全体がリンク**で `/qa/[id]` へ
- 展開ボタン・カード内の返信フォーム・票数は削除

### `/qa/[id]`（詳細・新規）

上から順に：

1. `← Q&A一覧` へ戻るリンク
2. 状態バッジ（解決済み / 未解決）と箇所リンク
3. 質問タイトル
4. 質問の全文
5. 投稿者・日時・タグ／自分の質問なら編集・削除、他人の質問なら通報
6. ベストアンサーがあれば目立つ枠で先頭に
7. 回答一覧（読み足し付き）。質問者には各回答に「ベストアンサーにする」ボタン
8. 一番下に回答フォーム。未ログインならログイン導線

### 読書ページのサイドパネル（`CommentPanel.tsx`）

いまは「引用した記事」がある節だけタブが出る。ここに Q&A を足して**常時タブ**にする。

| タブ | 中身 |
|---|---|
| コメント | 純粋なコメントだけ（`is_qa` が消えるので混ざりようがない）。並び替え・絞り込み・投稿フォームは今のまま |
| Q&A | その節の質問カード一覧。カードを押すと `/qa/[id]` へ。上部に「質問する」ボタン |
| 引用した記事 | 今のまま。1件も無ければ出さない |

タブ順は「コメント → Q&A → 引用した記事」。件数はタブラベルに出す（`Q&A (2)`）。

章コメント・書コメント（`ChapterComments.tsx`）も同じ考え方で、コメント欄からは Q&A を外し、
質問の投稿は Q&A 側へ寄せる。

### その他の画面

- **通知** — `/qa` ではなく `/qa/[id]` へ直接飛ぶようにする（`notificationTarget.ts:41` の TODO 解消）
- **プロフィール（自分のコメント）** — 自分の質問・回答も見えるようにするか要検討。最低限、
  自分の質問へ辿れる導線は残す
- **検索** — `bible/views.py` のコメント検索は `Comment` だけを見ている。質問は含めない
  ことにした（`/qa` に専用の検索欄があるため）。必要になったら足す

---

## 影響範囲（`Comment` にぶら下がっている機能）

| 機能 | いまの状態 | 対応 |
|---|---|---|
| **通知** | `Notification.comment` FK 一本。`target_kind` を `root.is_qa` で判定している | `question` / `answer` の FK を足す。回答が付いたら質問者へ通知。`target_kind` は `qa` を Question ベースで返す。**必須** |
| **投票** | `Vote` は `Comment` への FK。`/qa` は数字を出すだけ | Q&A には作らない。`Vote` はコメント専用のまま |
| **通報** | `Report` は `Comment` への FK | `question` / `answer` の FK を足す。Admin のモデレーション画面も対応 |
| **栞** | `Bookmark.comment` でコメントを栞にできる | 変更なし。質問は栞にできなくなる |

---

## 廃止するもの

- `Comment.is_qa` / `Comment.title` / `Comment.best_answer` と、それらを使う index・制約
- `comments/views.py` の `QACommentListView` / `SetBestAnswerView`
- `comments/serializers.py` の `QACommentSerializer` / `BestAnswerSerializer`
- `CommentInput` の `showQaOption`（コメント欄から質問を投稿する経路そのものを廃止）
- `CommentItem` の `Q&A` バッジ
- `frontend/src/components/qa/QACard.tsx` の展開・返信・ベストアンサー選択機能
- `TrendingCommentView` が `QACommentSerializer` を流用しているので、専用の serializer に差し替える

---

## 段階（PR 単位）

**2026-08-02 に段階1〜5すべて実装済み。** 以下は実装時の区切りの記録。

### 段階1：バックエンドの土台

`qa` アプリと `Question` / `Answer` を作り、API を一通り生やす。既存の Q&A は**まだ触らない**
（新旧が並走する状態）。pytest を書く。

### 段階2：通知と通報をつなぐ

`Notification` と `Report` に `question` / `answer` の FK を足し、回答時の通知を作る。
Admin のモデレーションも対応。

### 段階3：フロントを新 API に載せ替える

`/qa` 一覧を要約カードに、`/qa/[id]` を新規作成。`QAPostForm` を新 API へ。
通知のリンク先を `/qa/[id]` へ。

### 段階4：読書ページのタブ

`CommentPanel` に Q&A タブを足す。`ChapterComments` からも Q&A を外す。
`CommentInput` の `showQaOption` を削除。

### 段階5：旧 Q&A の撤去

`Comment.is_qa` / `title` / `best_answer` を落とす migration。旧ビュー・旧 serializer・
旧 UI を削除。seed を新構造に合わせる。検索に質問を含めるかをここで判断。

---

## 原則

1. **既存の質問データは移さない。** リリース前なので捨ててよい。seed を作り直す。
2. 箇所の持ち方は `Comment` / `Bookmark` / `Article` と揃える（`CanonicalBook` + 章 + 節）。
   ここだけは独自の形にしない。
3. 段階1〜2 は新旧並走。画面が壊れない状態を保ったまま進める。
4. 各段階でテストを書き、`git push` して GitHub Actions がグリーンになるまで確認する。
5. 迷ったら**機能を足さない**。投票・栞は落とす決定をした。後から足す方が安い。
