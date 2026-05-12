# Phase 4 — 聖書本文

## 概要

Book / Chapter / Verse モデルと GET API、口語訳4福音書のインポートスクリプトを実装した。
インポートは `python manage.py import_gospel` で実行でき、冪等（何度実行しても安全）。

---

## 作成・変更ファイル一覧

```
backend/
├── bible/                                   ← 新規作成
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                            ← Book / Chapter / Verse
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── management/
│       └── commands/
│           └── import_gospel.py             ← HTM パーサー + DB 投入
│
├── tests/
│   └── test_bible.py                        ← API テスト 9 件
│
├── requirements.txt                         ← beautifulsoup4 追加
└── config/
    ├── settings/base.py                     ← LOCAL_APPS に bible 追加
    └── urls.py                              ← api/ に bible.urls を登録

docker-compose.yml                           ← ./text:/text:ro を backend にマウント
```

---

## モデル設計

### Book

| フィールド | 型 | 備考 |
|-----------|-----|------|
| id | UUIDField | PK |
| name | CharField | 例: "マタイによる福音書" |
| translation | CharField | 例: "口語訳" |
| order | PositiveSmallIntegerField | 表示順 |
| created_at / updated_at | DateTimeField | 自動付与 |

- `(name, translation)` に複合ユニーク制約 → 翻訳が増えても衝突しない

### Chapter / Verse

- `Chapter`: book FK + number（`(book, number)` でユニーク）
- `Verse`: chapter FK + number + text（`(chapter, number)` でユニーク）
- 両モデルとも `ordering = ["number"]` で節番号順に返す

---

## API エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|------|------|
| GET | `/api/books/` | 不要 | 書一覧（order 順） |
| GET | `/api/books/{id}/chapters/` | 不要 | 章一覧。書が存在しない場合 404 |
| GET | `/api/chapters/{id}/verses/` | 不要 | 節一覧。章が存在しない場合 404 |

---

## インポートスクリプト（`import_gospel.py`）

### 実行方法

```bash
docker-compose exec backend python manage.py import_gospel
# --path で HTM ファイルの場所を指定（デフォルト: /text）
docker-compose exec backend python manage.py import_gospel --path /text
```

### 処理フロー

```
text/*.htm をファイル名でソート（101→102→103→104 → order 1〜4）
  ↓ ファイルごとに
BeautifulSoup でパース
  ├─ <h3> から書名を抽出（"101 マタイによる福音書 - Matthew" → "マタイによる福音書"）
  └─ <a name="{book}-{ch}:{v}"> アンカーを全走査
       ├─ 次の <small> 兄弟要素を探す
       └─ <small> の次のテキストノードを節本文として取得
  ↓
Book.get_or_create(name, translation)
Chapter.get_or_create(book, number)
Verse.get_or_create(chapter, number, defaults={"text": ...})
```

冪等なので2回実行しても重複しない。既存データは上書きされない（text の変更は反映されない）。

### docker-compose のマウント設定

```yaml
backend:
  volumes:
    - ./backend:/app
    - ./text:/text:ro   # ← 追加（読み取り専用）
```

---

## テスト結果

```
tests/test_bible.py .........   9 passed
tests/test_auth.py  .............  13 passed
合計: 22 passed in 2.81s
```

---

## 確認してほしいポイント

### 1. `import_gospel.py` — テキスト抽出ロジック

```python
sibling = anchor.next_sibling
while sibling is not None and getattr(sibling, "name", None) != "small":
    sibling = sibling.next_sibling
text = str(sibling.next_sibling).strip()
```

アンカーから兄弟要素を辿って `<small>` を探し、その次のテキストノードを取得している。
**確認してほしいこと:** 実際に `import_gospel` を実行して、取得されたテキストに HTML タグや `&nbsp;` などのゴミが混入していないか目視確認してほしい。特に節の途中にある `<a href="index.htm#000">` ナビゲーションリンクの影響を受けていないか。

### 2. `import_gospel.py` — 既存データの text 更新不可

現状 `get_or_create(defaults={"text": text})` を使っているため、**既にインポート済みの節のテキストを修正しても反映されない**。再インポートで内容を上書きしたい場合は `update_or_create` に変更が必要。MVP では問題ないが注意してほしい。

### 3. `bible/models.py` — Verse.text にインデックスなし

フルテキスト検索を将来追加する場合、`text` フィールドに PostgreSQL の `GIN` インデックスが必要になる。現状は MVP スコープ外。

### 4. `bible/views.py` — ページネーションなし

マタイ福音書は 28 章・1071 節ある。`GET /api/chapters/{id}/verses/` は一度に全節を返すため、節数の多い章でレスポンスが大きくなる。フロントエンド実装時（Phase 10）にページネーション追加を検討してほしい。

### 5. `docker-compose.yml` — text マウントの `:ro`（読み取り専用）

`./text:/text:ro` で読み取り専用マウントしている。インポートスクリプトがファイルを書き換えることはないので問題ないが、コンテナ内から `text/` を誤って変更できないよう意図的に `:ro` にしている。

---

## インポート後の動作確認手順

```bash
# 1. インポート実行
docker-compose exec backend python manage.py import_gospel

# 2. 書一覧が返るか確認
curl http://localhost:8000/api/books/

# 3. マタイ第1章の節一覧を確認（book_id は上記レスポンスから取得）
curl http://localhost:8000/api/books/{book_id}/chapters/
curl http://localhost:8000/api/chapters/{chapter_id}/verses/
```

---

## 次フェーズ（Phase 5）への引き継ぎ

- Phase 5 のコメントモデルは `Verse` に FK を張る（`verse = ForeignKey(Verse, ...)`）
- `GET /api/comments/?verse_id=` のクエリパラメータに `Verse.id`（UUID）を使う
- `Verse` の UUID は Phase 4 の API レスポンスに含まれているので、フロントが保持できる
