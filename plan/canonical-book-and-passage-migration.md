# 全書追加の土台：訳非依存の書（CanonicalBook）と箇所集約への段階移行

全66書＋複数訳を扱うための基盤整備。**モデルの全面作り直しではなく**、
「フロント(`books.ts`)にしか無い訳非依存の書 slug を、backend にも最小限で置く」変更を土台に、
コメント／ブックマークの保存を訳別 Verse から「箇所」へ段階的に移す。

## 背景（調査で判明した事実）

- **読み取りは既に箇所で集約済み**：フロント `src/lib/versions.ts` が `(slug, 章, 節番号)` から
  全訳の Verse id を集め、コメント API（`verse_ids=a,b,c`）でまとめて取得している。
  → 「コメントが訳ごとに散る」問題は**表示上はもう回避できている**。
  弱点は (a) 訳の数だけ API を叩く N+1、(b) 保存は依然 1 訳の Verse に貼り付く。
- **backend に訳非依存の書が無い**：`Book = (name, translation)` で口語訳「マタイによる福音書」と
  KJV「Matthew」は別レコード。両者を束ねる slug は `books.ts` にしか存在しない。
  → コメント／ブックマークを backend で箇所保存するには、まず**訳非依存の書 ID** が要る。
- **ReadingProgress は既に版依存**：`FK Book`（訳別）＋ユニーク `(user, book)`。
  「口語訳は10章／KJVは3章」を既に表現できており、**要件を満たすので触らない**。

## 原則

1. 抽象化は最小限にする（初心者が読んで直せることを最優先）。
2. 「訳非依存の書」と「訳非依存の箇所」は分けて考える。今回作るのは書だけ。
   箇所は Bookmark／Comment 移行時に「3項目直接持ち」か「小さな Passage」かを実コードで判断。
3. 各段階は独立して push・ロールバック可能にする。同時多発移行はしない。
4. `versification_code`・静的JSON対応表は WLC/LXX（番号体系が違う版）追加時まで作らない。
5. 最終的に書の正は backend `CanonicalBook.slug`。`books.ts` は移行完了後に重複整理。

---

## 段階1：基準の章節番号を文書で定義（コード変更なし）【完了＝下記定義】

**目的**：アプリ内部が採用する「基準の章節番号体系」を言葉で確定する。

**確定した定義（この段階の成果物）**：

1. アプリ内部の箇所キーは **`canonical_book.slug` / `chapter`（章番号）/ `verse`（節番号）** の3つ。
2. この番号は**特定の翻訳そのものではなく、アプリ内部の基準番号**である
   （「口語訳の番号」でも「KJVの番号」でもなく、アプリが採用する1つの基準）。
3. **「同じ箇所であること」と「その版に本文が存在すること」は別問題**。
   基準箇所 (slug,章,節) は常に定義できるが、各版にその本文があるとは限らない
   （例：ある節が一部の版に無い＝並列表示ではその版だけ空欄／非表示にする）。
4. **番号体系の変換は現時点では行わない**（口語訳・KJV 等、番号体系が同じ版だけを対象とする）。
5. WLC/LXX など**番号体系の違う版を追加する段階で、初めて変換層を検討**する（段階8）。

**変更対象ファイル**：本ファイル（上記定義の記載）。

**データ移行**：なし。

**完了条件**：上記5点が文書に確定している（＝本節をもって完了）。

**ロールバック**：不要（文書のみ）。

**テスト**：不要。

---

## 段階2：最小の訳非依存書モデル `CanonicalBook` を追加

**目的**：口語訳 Matthew と KJV Matthew が「同じ書」と backend で分かるようにする。属性は最小限。

**`order` は入れない（重要）**：CanonicalBook に単一のグローバル表示順を持たせると、正典順を
唯一の正式順序として固定してしまい、外典・別伝統の並びを表現しにくくなる（コンセプトに反する）。
CanonicalBook の目的は「同じ書を訳横断で束ねる」ことだけなので **`slug` のみ**とする。
表示順は当面 `books.ts` の既存情報を使う。backend へ順序を移す必要が出たら、単純な `order` ではなく
「どの並び方における順序か」を持つ `Collection` / `CollectionBook`（collection・canonical_book・order）
として将来設計する（**今回は作らない**）。

**変更対象ファイル**：
- `backend/bible/models.py`：`CanonicalBook` 追加（`slug` unique のみ）。
  `Book` に `canonical_book = FK(CanonicalBook, on_delete=PROTECT, null=True)` を**まず null 許容**で追加。
- `backend/bible/migrations/000X_add_canonicalbook.py`：スキーマ移行（自動生成）。
- `backend/bible/admin.py`：`CanonicalBook` を admin 登録（任意、確認用）。

```python
class CanonicalBook(models.Model):
    slug = models.SlugField(unique=True)
    # order は持たせない（順序は books.ts、将来は Collection で表現）

class Book(BaseModel):
    canonical_book = models.ForeignKey(
        CanonicalBook, on_delete=models.PROTECT,
        related_name="editions", null=True,  # 段階3で埋め、その後 NOT NULL 化
    )
    # 既存 name / translation / order はそのまま
```

**データ移行**：この段階では投入しない（null のまま）。表示名・英語名・ジャンル・章数・順序は**移さない**。

**重要：Django の過去マイグレーションから `canonical_books.json` を読まない**。
データマイグレーション(`RunPython`)が実行時に外部 JSON を読む設計にすると、将来 JSON を更新した後に
空 DB で最初からマイグレーションを流したとき、当時と違うデータで処理されうる（マイグレーションは
将来も同じ結果を再現できる必要がある）。よって次の段階分けを厳守する：

```text
段階2 ：スキーマ追加のみ（nullable FK、データ投入なし）
  ↓
段階3A：canonical_books.json を読む冪等な管理コマンドで投入・全件検証
  ↓
段階3B：各既存環境（本番含む）でバックフィル実行・未リンク0を確認
  ↓
段階3C：Book を作る全経路を CanonicalBook 対応にする＋空 DB 初期構築を確認
  ↓
段階3D：↑両方の確認後、別マイグレーションで Book.canonical_book を NOT NULL 化
```

**完了条件**：migrate が通り、既存機能（読む・コメント・栞）が無傷。`CanonicalBook` は空でよい。

**ロールバック**：マイグレーションを1つ戻す（`migrate bible 000X-1`）。FK と表はスキーマから消える。既存データ無影響。

**テスト**：
- `CanonicalBook` 作成・`slug` unique 制約のモデルテスト。
- 既存 bible/comments/bookmarks のテストが全てグリーンのまま（回帰確認）。

---

## 段階3：既存 Book のリンクと Book 作成経路の CanonicalBook 対応（3A〜3D）

NOT NULL 化は「既存データのバックフィル」だけでは準備完了にならない。Book を作る**全経路**が
canonical を必ず設定でき、かつ**空 DB からの初期構築**も通ることを確認してから行う。3A〜3D に分ける。

### 段階3A：正本 JSON ＋ 冪等リンクコマンド 【完了・PR #2 マージ済】

- 正本 `backend/bible/data/canonical_books.json`（slug ごとに `books:[{translation,name}]`。**10 canonical / 18 edition**）。
  ※ backend が slug を知らない問題への解。手で移行コードに埋めず、確認可能な専用データファイルに分離。
- `sync_canonical_books` コマンド：正本を読み既存 Book を CanonicalBook へリンク。
  冪等・`transaction.atomic`・`--dry-run`・正本↔DB の**完全一致**要求・不一致/曖昧/未リンクは**非ゼロ終了**。
- テスト：backend（リンク/冪等/dry-run/不一致/曖昧/空/実正本の妥当性）＋ frontend 一致テスト
  （`canonical_books.json` ↔ `books.ts`。Docker では正本不在でスキップ、CI で検証）。
- `.gitignore`：`data/` 無視から `backend/bible/data/` を例外化。
- **範囲外**：NOT NULL 化・作成経路の改修。

### 段階3B：各既存環境のバックフィル（本番は手動・要明示承認）【完了】

**本番実施済み**（2026-07-11）：Render Shell で dry-run（作成10/リンク18/未対応0/曖昧0）→ 本実行 →
`canonical=10 book=18 unlinked=0` 確認 → 再実行で全件スキップ（冪等）。ローカルも済。全既存環境 未リンク0。

- **目的**：既存環境（ローカル/本番）の Book を全件リンクし未リンク0にする。
- **重要**：`docker-entrypoint.sh` は `migrate→seed_en→runserver`。**sync_canonical_books は自動実行されない**。
  本番（Render）はシェルで手動実行。自動化しない。
- 手順：①DB バックアップ確認 → ②`--dry-run` 実行（結果を報告）→ ③想定どおりなら**明示承認後**に本実行
  → ④確認（CanonicalBook=10 / Book=既存件数 / `canonical_book IS NULL`=0 / 主要画面正常）→ ⑤再実行で全件スキップ。
- **完了条件**：全既存環境で未リンク0。

### 段階3C：Book を作る全経路を CanonicalBook 対応にする 【完了・PR #3 CI green】

実装済み：共通 `bible/canonical.py`（正本の完全一致のみ・推測なし・既存 NULL は補完・別リンク済みは
上書きせずエラー）に loader/import_gospel/kvj/greek を集約。`import_coptic` は正本未登録につき
取り込み時エラー化（統合テスト skip・パーサ単体は維持）。admin は新規作成時のみ canonical 必須。
`tests/factories.make_book` ＋ 空 DB import_scripture 統合テスト。311 passed/13 skipped。NOT NULL 化は含めない。

**後続課題（Coptic・段階3Cには含めない）**：
1. **skip した統合テストの復活検討**：本番でエラーにする挙動は維持しつつ、テストでは
   テスト専用の canonical マッピング（monkeypatch / テスト用 JSON fixture / 解決関数への注入）を与え、
   パーサ→DB 保存の成功系テストを復活できるか検討する。テスト専用対応表は本番採用を意味しない。
   （skip の13件は全て `test_import_coptic.py` の統合テストで、理由は「Coptic 未登録」のみ＝確認済み。）
2. **Coptic の正式登録は別段階**：書名・所属 CanonicalBook・独立書か否か・原文出所・ライセンス・
   章節構成・正本 JSON への正式名称を確認できるまで、本番は無効のままとする。

- **目的**：NOT NULL 化後もあらゆる Book 作成で canonical を必ず設定でき、空 DB 初期構築も通る。
- **Book 作成経路（調査結果）**：
  - 本番投入：`importers/loader.py`（import_scripture / import_others 経由）、`import_gospel`、`import_kvj`、`import_greek`。
  - `import_coptic`：**正本に無い Coptic 書を作る**（現状 DB 未使用）。→ 正本に coptic を足す or 対象外として整理を先に決める。
  - Django admin `BookAdmin`：UI から canonical 無しで作成可能 → フォームで必須化 or 運用で禁止。
  - テスト fixture：`tests/conftest.py`・`test_bible`・`test_comments`・`test_translations`・`test_search`
    （`Book.objects.create` が canonical 未設定）→ 共通 factory で canonical 付与。
  - **seed_en は Book を作らない**（読み取りのみ）。bible API は**読み取り専用**（書き込み無し）。
- **共通化**：`get_or_create_canonical_book_for(translation, book_name)` を1つ用意し、正本の**完全一致**で
  slug を引き当て CanonicalBook を get_or_create（**書名の曖昧推測はしない／一致しなければエラー**）。
  上記すべての作成経路がこれを使う。空 DB でも import が canonical を自動生成できる。
- **テスト**：新規 Book が `canonical_book=NULL` で作られない／import 再実行の冪等／
  **空 DB から migrate→import→アプリ起動が通る CI テスト**（既存バックフィルとは別問題として必須）。
- **完了条件**：全作成経路が canonical 必須。空 DB 初期構築が緑。

### 段階3D：`Book.canonical_book` を NOT NULL 化（別ブランチ・別PR）【完了・PR #4 CI green】

実装済み：`models` から `null=True` 除去、`migration 0003`（AlterField SET NOT NULL、one-off default 不要）。
NOT NULL 下では NULL Book を作れないため sync/canonical_imports テストを調整。311 passed/13 skipped、
reverse/forward・空 DB 統合テスト確認。**マージ時に Render の migrate で 0003 が本番適用される**（3B 済みのため安全）。

- **前提**：段階3B（全既存環境 未リンク0）と段階3C（空 DB 初期構築成功）の**両方**を確認済み。
- スキーマ移行のみ（`null=False`）。データ処理はしない。
- **ロールバック**：マイグレーションを1つ戻す。

---

## 段階4：箇所→全訳 Verse を一括取得する backend 処理（N+1解消）【完了・PR #5 CI green】

実装済み：`GET /api/references/<slug>/books|chapters/<n>|verses/<n>/<n>`（読み取り専用、
`slug→editions→章/節` を select_related、**クエリ数=2 で訳数非依存**、未知slug404・該当なしは空配列、
応答は id＋translation の最小）。`versions.ts` は resolveVersion* のシグネチャ据え置きで中身のみ新 API 1回に差替
（page.tsx 等は無改修）。FK・versification は不変。backend 318 passed/frontend 219 passed。


**目的**：フロント `versions.ts` が訳ごとに叩いている書→章→節取得を、backend の1呼び出しに置換。
**Comment/Bookmark の FK は変えない**ので変更は小さく、全書・多訳の N+1 を先に潰せる。

**API の役割は「コメント取得専用」に狭めない**：汎用の「**箇所に存在する各版の Verse を返す**」
エンドポイントとして設計し、対訳ビュー等でも再利用できるようにする。本文は用途次第で含める
（重い場合はまず id＋version、後から text を足せる形にしておく）。

**変更対象ファイル**：
- `backend/bible/views.py`＋`backend/bible/urls.py`：新エンドポイント
  `GET /api/references/<slug>/<chapter>/<verse>`（節）と章版。
  応答例（text は任意フィールド。まず id＋translation でも可）：
  ```json
  {"reference": {"book": "john", "chapter": 3, "verse": 16},
   "verses": [{"id": "…", "translation": "口語訳", "text": "…"},
              {"id": "…", "translation": "KJV", "text": "…"}]}
  ```
  実装は `CanonicalBook(slug) → editions(Book) → Chapter(number) → Verse(number)` を
  1クエリ群で解決（`select_related`/`prefetch_related`）。
- `backend/bible/serializers.py`：応答用の軽量シリアライザ。
- フロント `src/lib/versions.ts`：`resolveVersionVerseIds` 等を**新エンドポイント1回**に置換
  （関数シグネチャは維持し中身だけ差し替え → 呼び出し側 `page.tsx` は無改修）。
- フロント `src/lib/api.ts`・`types.ts`：新エンドポイント用の関数と型。

**データ移行**：なし（読み取りのみ）。

**完了条件**：
- reader 画面の「全バージョン表示」が、訳数に依存せず**API 1回**で解決される。
- 表示結果（集まるコメント・節）が現状と一致。

**ロールバック**：`versions.ts` を旧実装（訳ごと取得）に戻すだけ。エンドポイントは残置可。

**テスト**：
- backend：新エンドポイントが全訳の Verse id を返す／存在しない訳をスキップする API テスト。
- フロント：`versions.ts` の単体テスト（1回の呼び出しで同じ id 集合を返す）。
- reader ページのテスト（`page.test.tsx`）が回帰なし。

---

## 段階5：Bookmark を訳別 Verse から「箇所」保存へ移行（5A〜5F）

**目的**：栞を訳非依存の箇所に紐づけ、**訳を切り替えると栞が消える潜在バグ**を解消。
新旧構造を一時併存させ、旧 `verse` FK は最後（5F）まで残す。

**調査で判明した前提（実コード）**：
- Bookmark は付加情報なし（`user/verse(FK)/comment(FK)`＋created_at のみ）→ 重複統合は「最古を残す」で単純。
- 同一ユーザーが同じ箇所を複数訳で栞できる（unique は `(user, verse)`）→ 箇所基準では統合が要り得る。
- 作成 API は `verse_id` を受け取る。一覧は `VerseBriefSerializer(source="verse")` で本文表示。
- **一覧→読書画面の遷移 URL は既に `slug/章/節番号` ベース**（verse id 非依存）。
- localStorage 栞は無い（サーバー専用・要認証）。外部モデルからの Bookmark 参照なし。
- **バグの位置**：`CommentPanel.tsx` の `isBookmarked = bookmarkMap.has(verse.id)`（訳固有 id 一致）。
  コメントは既に `allVersionVerseIds` で訳横断集約済み＝栞だけ取り残されている。

**作成/削除 API の方針（確定）**：入力は `verse_id` のまま維持し、**backend が verse_id から
`canonical_book/章番号/節番号` を導出**して保存/検索する。クライアントから箇所値は受け取らない
（偽装防止・実在 Verse から必ず計算）。作成・削除は transaction で囲み、Verse なし/canonical なし/
章節取得不可/同一箇所の既存栞/新旧矛盾はエラー。**この方針なら 5F で作成 API を slug 入力へ変える必要はない**
（`verse_id` は「保存先」ではなく「箇所を探す入力」として残せる）。

### 5A：箇所列の追加（スキーマのみ）【完了・PR #6 CI green】
- `backend/bookmarks/models.py`：nullable で `canonical_book(FK PROTECT)`／`chapter_number`／`verse_number` を追加。
  **`verse` FK は残す**（既に nullable）。ユニーク制約・API・フロント・既存データは**変更しない**。
- migration（スキーマのみ、データ処理なし）。forward/reverse と既存 API 不変を確認。
- 「新しい値を置ける空の箱を足すだけ」に限定。

### 5B：既存栞のバックフィル（＋必要なら重複統合）【完了・本番実行済み。バックフィルコマンドは5E-2で削除】

本番重複調査＝**重複0**（verse栞300/総数443）。`backfill_bookmark_canonical`（冪等・--dry-run・
1トランザクション・重複/箇所NULL残存で安全停止）で本番300件をバックフィル済み（箇所NULL=0）。
**このコマンドは5B用の一度きりツールで、5E-2 で「箇所なし verse 栞」自体が DB 禁止になったため削除した。**
- 本番の重複調査（読み取りクエリ）結果を確認してから実施。
- `verse → canonical_book / chapter.number / number` を導出して新3列を埋める管理コマンド（冪等・本番手動・要承認）。
- **重複が0なら統合せず単純バックフィル**。ただし**0前提をハードコードせず**、コマンド側で重複検出したら安全に停止。
- 重複がある場合の統合ルール：同一 `(user, 箇所)` は**最古 created_at を1件残す**。

### 5C：新規作成・削除の backend 導出 【完了・PR #8 CI green】

実装済み：作成 API 入力は `verse_id` のまま、backend が verse から箇所を導出して dual-write。
**重複判定は「旧 verse 一致 or 同一箇所(user,canonical_book,章,節)」で 409**（別訳の同一箇所も二重不可＝
location 一意化を先取り。DB ユニーク制約は 5E）。削除は id ベース維持
（5D でもフロントは栞の id を持つため十分＝delete-by-verse は不要と判断）。comment 栞は箇所 NULL。
（5C デプロイ後の再バックフィルは実施済み。バックフィルコマンド自体は 5E-2 で削除。）
- 作成 API 入力は `verse_id` のまま、新3列を backend 導出で保存（互換で `verse` FK も当面セット）。
- 削除も `verse_id` → 箇所解決 → 同一ユーザーの箇所栞を削除（Bookmark id 削除 API は維持可）。
- フロントの作成/削除呼び出しは無改修。

### 5D-1：読書画面の判定を箇所基準へ 【完了・PR #9 CI green】
- serializer に栞の箇所 `reference`（{book: slug, chapter, verse}。verse 栞のみ）を公開。一覧 queryset に canonical_book を select_related。
- `CommentPanel` の判定を `verse.id 一致` → **箇所一致（bookSlug/章/節番号）**へ（訳跨ぎでハイライト維持＝本バグ解消）。作成は verse_id 送信のまま、削除は一致栞の id。reader page から bookSlug を渡す。`Bookmark` 型に reference 追加。
- `verse` FK はまだ残す。翻訳読書ページは栞UIを出さないため対象外。**要 UI スモーク**（訳切替でハイライト維持）。

### 5D-2：Bookmark 一覧の本文を現在訳で解決 【見送り】
- 調査結果：一覧に「現在訳」の概念が無い（訳セレクタ無し／`verse_detail` の元訳本文を表示／遷移URLは既に slug ベース）。
  新規UX機能になり移行の範囲外・5E の前提でもないため**見送り**。一覧本文は現状維持。

### 5E：本番安定確認・制約追加

**訂正（確定・案B）**：comment 栞は箇所3列が NULL のままなので**列の単純 NOT NULL は不可**。
判別軸は 5F で消える `verse` FK ではなく**恒久的に残る `comment`** を使う（verse 栞＝comment NULL）。

**5E-2 で追加する制約（別PR・私・5E-1 が全0のときのみ）**：
1. **部分ユニーク** `unique_user_location_bookmark`：`(user, canonical_book, chapter_number, verse_number)`、
   condition = 箇所3列すべて NOT NULL。同一ユーザー・同一箇所の重複栞を DB で禁止（5C の API dedup を DB でも担保）。
2. **CHECK** `bookmark_comment_xor_location`：各栞は「comment 栞（comment NOT NULL・箇所3列すべて NULL）」か
   「箇所栞（comment NULL・箇所3列すべて NOT NULL）」のどちらか。→ ①箇所 all-or-none ②verse 栞は箇所必須
   ③comment 栞は箇所なし、を1つで担保。**verse FK 非依存＝5F 後もそのまま残せる**。
- 注意：この CHECK は **verse/comment FK の排他までは保証しない**（例: verse+comment 両方・箇所全 NULL は通る）。
  本番に無いことは 5E-1 の `both_verse_and_comment` で確認。既存 `(user,verse)`・`(user,comment)` 部分ユニークは変更しない。
- **テスト**：成功=（verseあり/commentなし/箇所3列あり）（commentあり/箇所全NULL）（同一箇所でもユーザー違いは可）
  （verseなし/commentなし/箇所3列あり＝5F後の形）／失敗=（同一ユーザー同一箇所の重複）（箇所3列の一部だけ）
  （comment+箇所両方）（commentなし・箇所全NULL）。
- **データ修正マイグレーションは入れない**（5E-1 で適合を確認してから制約だけ追加）。
- 分割：**5E-1 本番事前確認（ユーザー・上記9項目すべて0）** → **5E-2 マイグレPR（私・`feature/bookmark-location-constraints`）**。

### 5F：旧 `verse` FK と互換コードの撤去【別PR・安定後】
- `verse` FK・旧 serializer フィールド・verse-id 判定・互換コード・不要テストを削除。comment 栞は不変。

**本番の重複調査（5B 前・あなたが Render で実行）**：`(user, canonical_book, 章, 節)` で 2件以上を集計。
報告項目：Bookmark 総数／verse 栞総数／重複グループ数／重複対象 Bookmark 総数／重複があれば最大20件。

---

## 段階6：Comment を「対象粒度の整理」後に箇所保存へ移行

**目的**：コメントの保存を訳横断の箇所へ。ただし Comment は粒度が多いので、
**移す対象と残す対象を先に確定**してから実装する。

**先に確定する粒度**（実装前にこの表を埋める。「全部を訳非依存にする」と最初から決めない）：

| 対象 | 現在の保存先 | 将来の保存先 | 訳横断か | 既存データの移行方法 |
|---|---|---|---|---|
| 書へのコメント（`book` FK） | 訳別 Book | canonical_book | 訳横断 | Book→canonical_book を書き写す |
| 章へのコメント（`chapter` FK） | 訳別 Chapter | (canonical_book, 章番号) | 訳横断 | Chapter→(canonical_book, number) |
| 節へのコメント（`verse` FK） | 訳別 Verse | (canonical_book, 章番号, 節番号) | 訳横断 | Verse→(canonical_book, ch.number, number) |
| 訳固有の言い回しへのコメント | （現状は節コメントに混在・区別なし） | **要判断**：任意の版情報を付与するか | 版依存 | **モデル変更前に残す必要があるか明文化**（今はやらない方針だが要確定） |
| 翻訳プロジェクトへのコメント（`translation_project`） | 版依存で意味あり | そのまま | 版依存 | 移さない |

**明文化が必須の論点**：「訳固有の言い回しへのコメント」を残す必要があるか。
現状は節コメントに混在し版を区別していない。残すなら箇所コメントに任意の `translation` を持たせる設計、
残さないなら全ての節コメントを訳横断へ倒す。**Comment モデル変更前にどちらかを確定する**。

**変更対象ファイル**：
- `backend/comments/models.py`：`verse/chapter/book` FK を箇所キー（canonical_book＋章番号＋節番号、
  粒度は number の null で表現）に。`translation_project` はそのまま。
- `backend/comments/serializers.py`：`_get_location_parts`／`_get_version_label`／
  `validate`（親子の同一節チェック）／`create` を箇所ベースに。
- `backend/comments/views.py`：`verse_id/chapter_id/book_id` および `verse_ids/…` フィルタを
  箇所フィルタへ。**`verse_ids` 集約が不要になり単純化**。
- `backend/notifications/serializers.py`：`root.verse_id` 等で出している target 種別・章節番号を箇所から算出。
- フロント：`src/lib/versions.ts` は**役目を終え削除／大幅縮小**、
  reader `page.tsx` の `allVersionVerseIds` ロジック撤去、`CommentPanel.tsx`、`types.ts`、`src/lib/api.ts`。
- **対象外**：`translations`（`TranslationUnit` は訳固有 Verse のまま＝原文に対する翻訳作業なので維持）。

**データ移行**：既存 Comment の `verse/chapter/book` FK →
対応する `canonical_book`＋章番号＋節番号へ変換。`translation_project` 付きはそのまま。
段階3・5 完了が前提。

**完了条件**：
- 同じ箇所のコメントが、どの訳で読んでも1つのスレッドに集約（表示だけでなく保存も箇所単位）。
- Q&A・返信ツリー・タグ・通報・通知リンクが全て維持。
- `versions.ts` の N+1 集約が撤去され、コメント取得が箇所クエリ1本になる。

**ロールバック**：段階5同様、旧 FK 列を並存させ逆データ移行で復元可能にしてから撤去。

**テスト**：
- 箇所集約（訳跨ぎで同一スレッド）のテスト。
- 粒度別（書/章/節）コメントの保存・取得テスト。
- 通知 target（`/matthew/3#verse-12` 生成）の回帰テスト。
- 返信の親子同一箇所バリデーションのテスト。
- comments/notifications 既存テストの回帰。

---

## 段階7：ReadingProgress / TranslationUnit は触らない（明記）

- **ReadingProgress**：既に `FK Book`（訳別）で版依存。「版ごとに進捗を分ける」要件を満たす。変更なし。
- **TranslationUnit**：訳固有 Verse への翻訳作業単位。訳固有であることに意味がある。変更なし。

**完了条件**：段階5・6の移行で誤ってこの2つを巻き込んでいないことを確認。

---

## 段階8：versification_code / 静的JSON対応表は後回し（明記）

**新テキスト投入の解禁タイミング（ユーザーに通知する合図）**：
- **番号体系が同じ・既存 slug を共有する版（GTR 福音書・文語訳 福音書 等）**：段階5・6 完了後なら
  正本に (訳名, 書名) を数冊足すだけで安全に投入可（Coptic の教訓＝未確認の書は入れない）。
- **LXX・ヘブライ語・旧約全般（番号体系が違う）**：**この段階8 完了が前提**。変換層が無いと対訳・
  コメント集約が箇所ズレで崩れる。ここまでは投入しない。

- 番号体系が同じ版（口語訳・KJV 等）だけの間は不要。
- WLC/LXX など番号体系の違う版を足す段階で、**版（edition）側に体系コード**を持たせ、
  ズレる箇所だけ静的JSON（`bible/data/versification/*.json`）で例外変換する。
- 体系コードは**コメントに付けない**（コメントは常に基準体系で保存されるため）。
- 状態は `exact / range / unmapped` の3つのみ。`unmapped` は並列表示せず単独表示に倒す。

---

## 段階9：`books.ts` の重複整理（移行完了後）

**目的**：訳非依存 slug の正を backend `CanonicalBook` に一本化し、二重管理を解消。

**順序**：
1. 段階3で `canonical_books.json` から `CanonicalBook` 初期データを作成済み。
2. 既存 Book は canonical にリンク済み（段階3）。
3. API レスポンスに canonical `slug` を含める。
4. フロントが API の slug を使うようになった後、`books.ts` の slug 重複を削除。

**注意**：表示名・英語名・ジャンル・章数・章タイトル・**表示順(order)**を**急いで backend へ移さない**。
まず slug の正だけを移す。order はそのまま `books.ts` に残し、backend へ移すなら将来 `Collection` として
（段階2の判断どおり単純な単一 order にしない）。表示メタは必要になった分だけ段階的に。

**完了条件**：slug の正が backend、フロントは API 由来。slug の二重定義が解消。
（order・表示メタは `books.ts` に残ってよい。）

**ロールバック**：フロントを `books.ts` 参照に戻す（API 由来へ切替える PR 単位で戻せる粒度にする）。

**テスト**：フロントのルーティング・訳解決（`resolveTranslation` 等）の回帰。

---

## まとめ（実施順）

1. 基準章節番号を文書化（コードなし・**段階1に定義確定済み**）
2. `CanonicalBook` 追加（`slug` のみ・null 許容 FK、order は持たせない）【PR #1 マージ済】
3. 既存 Book のリンクと作成経路対応（NOT NULL 化はここでは**しない**）
   - 3A：正本 `canonical_books.json` ＋冪等 `sync_canonical_books`【PR #2 マージ済】
   - 3B：各既存環境（本番含む）でバックフィル・未リンク0確認（本番は手動・要明示承認）
   - 3C：Book 作成全経路を canonical 対応（共通 `get_or_create_canonical_book_for`）＋空 DB 初期構築を CI 確認
   - 3D：段階3B・3C 両方の確認後、別PRで `Book.canonical_book` を NOT NULL 化
4. 箇所→各版 Verse 一括取得 API（汎用設計・N+1解消、FK は変えない）
5. Bookmark を箇所保存へ（訳跨ぎ栞バグ解消／設計の試金石）
6. Comment を粒度整理後に箇所保存へ（`versions.ts` 撤去で純減／訳固有コメントの要否を先に確定）
7. ReadingProgress / TranslationUnit は不変
8. versification_code / 静的JSON は WLC/LXX 追加時まで後回し（体系コードは版側）
9. 移行完了後に `books.ts` の slug 重複整理（slug の正を backend に。order・表示メタは残置可）

各段階は 1 段階ずつ push・確認（CI グリーン）してから次へ進む。
