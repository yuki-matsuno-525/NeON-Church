# 日本語・英語カバレッジ監査（2026-08-01）

## 対応結果（2026-08-02）

初回監査後、本文データと本文に付随する名前付き章見出しを除き、検出したプロダクト上の片言語固定箇所へ対応した。

- 記事の一覧・作成・閲覧・編集・引用・コメント・公開範囲・自動保存を共通日英辞書へ移行
- 記事タグ15件はDBの安定したslugをキーに日英表示名を切り替え（既存データとURLは変更なし）
- 相対時刻を全実運用画面で `useRelativeTime()` に統一
- Q&A、ホーム、通知、コメントのお気に入りの箇所表示を構造化データから選択言語で組み立て
- 削除済みコメントはAPIが空本文＋削除フラグを返し、通常コメント・記事・翻訳・通知・お気に入りの全てでクライアントが翻訳
- APIクライアントは `Accept-Language` を送り、バックエンド由来の混在文言を画面へ露出せず、選択言語のステータス別メッセージへ統一
- `html lang`、既定SEO、Open Graph、Twitter、About・規約類・書・章・404のメタデータを言語cookieに追随
- PWAマニフェストはOS取得時にも意味が通る日英併記へ変更
- 共通エラー操作、未読、読書中、公開プロフィールの記事タブ、引用記事タブを日英対応
- `/demo` ルート4ファイルと静的デモHTML 3ファイルを削除

## 追加対応（2026-08-02）

初回対応のあとに入った機能が日本語のみだったため、同じやり方で日英へ揃えた。

- 読書プランの全画面（一覧・作成・閲覧・編集）と、日の編集・章選び・章リンク
- プランの公開範囲は記事と同じ `visibility*` キーを共用（同じ意味の言葉を二重に持たない）
- 読む画面の「まとめてお気に入り」（開始ボタン・下のバー・件数・失敗時の知らせ）
- `useChapterNumbers` が投げる「この訳にはこの書がありません。」を辞書経由に変更
- 読み込み失敗の状態は文言ではなく真偽値で持つようにした。言語を切り替えても
  読み込みからやり直さずに済む（`/plans/[id]` と `/plans/[id]/edit`）

追加したキーは日英とも同数。

ユーザー指定により、次の2項目は変更していない。

- 聖書・関連文書の本文（日英あり66書、英語本文のみ30書）
- 本文構成の一部である名前付き章見出し（英語のみ247件）

以下の各節は、修正根拠を残すための**初回監査時点の検出結果**である。

## 監査条件

- 対象コミット: `ae9234c`
- 監査ブランチ: `codex/i18n-coverage-audit`
- 対象: ユーザー向け UI、アクセシビリティ文言、SEO/PWA メタデータ、API が返す表示用文言、書名・章見出し・本文データ、デモ、公開ドキュメント
- 「片方しかない」の定義: 同じ機能・同じ意味の表示について、日本語 UI と英語 UI のどちらか一方にしか文言・データ・切替経路がないもの
- 対象外: ユーザー投稿（記事・コメント・翻訳プロジェクト名など）、ギリシャ語・ヘブライ語の原文そのもの、ソースコード内のコメント、管理コマンドだけに出る運用者向けメッセージ

## 初回監査時点の結論

共通 UI 辞書は **日本語 357 キー／英語 357 キーで差分 0** だが、辞書を経由していない箇所が残っている。特に影響が大きいのは、次の4群。

| 分類 | 日本語のみ | 英語のみ | 日英あり |
| --- | ---: | ---: | ---: |
| 共通 UI 辞書のトップレベルキー | 0 | 0 | 357 |
| 書の表示名メタデータ | 0 | 0 | 96書 |
| 聖書・関連文書の本文 | 0書 | 30書 | 66書 |
| 名前付き章見出し | 0件 | 247件（13書） | 0件 |
| 記事の定義済み主題タグ | 15件 | 0件 | 0件 |

UI では、記事機能の画面文言がほぼ全て日本語固定、404 は英語固定、相対時刻は日本語固定、SEO/PWA は英語固定、`<html lang>` は日本語固定になっている。API のエラー文言は日英が混在し、リクエスト言語に応じて切り替わらない。

## 1. ユーザー向け UI

### 1.1 記事機能は日本語版のみ

記事機能はナビゲーション名 `articles` だけ共通辞書にあるが、画面本体・入力補助・エラー・確認ダイアログ・公開範囲・引用パネル・コメントは日本語の直書きになっている。英語 UI に切り替えても日本語のまま表示される。

対象:

- `frontend/src/app/articles/page.tsx`: 一覧見出し、説明、新規作成、絞り込み、列見出し、空状態
- `frontend/src/app/articles/new/page.tsx`: ログイン案内、作成フォーム、placeholder、エラー、ボタン
- `frontend/src/app/articles/[id]/page.tsx`: 取得エラー、戻る、編集、関連記事
- `frontend/src/app/articles/[id]/edit/page.tsx`: 編集不可、削除、本文・要約・タグ・プレビュー・引用タブ
- `frontend/src/components/articles/ArticleBody.tsx`: 空本文、引用解決失敗
- `frontend/src/components/articles/ArticleComments.tsx`: 投稿・削除・空状態・ログイン案内
- `frontend/src/components/articles/CitationPanel.tsx`: 検索、お気に入り、書・章・節選択、範囲選択、挿入、エラー
- `frontend/src/lib/articles.ts`: `公開`／`限定公開`／`下書き` と説明
- `frontend/src/hooks/useAutosave.ts`: `保存中...`／`保存しました`／`保存できませんでした`
- `frontend/src/app/profile/[username]/page.tsx`: `記事 (N)` タブだけ日本語固定
- `frontend/src/components/reader/CommentPanel.tsx`: `引用した記事 (N)` タブだけ日本語固定
- `backend/articles/serializers.py`: 記事・記事コメントの validation と削除済み本文が日本語固定

### 1.2 記事の主題タグ15件は日本語名のみ

`backend/articles/models.py` の `INITIAL_TAGS` は、slug は英語だが表示名は日本語1列だけ。API は `name` をそのまま返し、記事画面も `tag.name` をそのまま表示するため、英語 UI 用ラベルがない。

| 日本語名 | slug |
| --- | --- |
| 苦しみ | `suffering` |
| 死と復活 | `death-and-resurrection` |
| 愛 | `love` |
| お金と施し | `money-and-giving` |
| 祈り | `prayer` |
| 断食 | `fasting` |
| ゆるし | `forgiveness` |
| 律法 | `law` |
| 罪 | `sin` |
| 救い | `salvation` |
| 終末 | `end-times` |
| 天使と悪魔 | `angels-and-demons` |
| 夢と幻 | `dreams-and-visions` |
| 女性 | `women` |
| 食べもの | `food` |

Q&A の定義済みタグ5件は `i18n.ts` の `tagNames` に日英の対応があり、この問題には該当しない。

### 1.3 相対時刻は日本語版のみ

`frontend/src/lib/utils.ts` の `formatRelativeTime()` は、`たった今`、`N分前`、`N時間前`、`N日前`、`ja-JP` を固定で返す。一方、`frontend/src/lib/i18n.ts` には日英対応済みの `useRelativeTime()` が別に存在する。

日本語固定関数を使っている実運用画面:

- `frontend/src/components/qa/QACard.tsx`
- `frontend/src/app/notifications/page.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/translations/[id]/page.tsx`
- `frontend/src/app/articles/[id]/page.tsx`
- `frontend/src/components/articles/ArticleComments.tsx`

公開プロフィール `frontend/src/app/profile/[username]/page.tsx` とホームの一部は `useRelativeTime()` を使っており日英対応済みなので、画面間で挙動が分かれている。

### 1.4 片言語固定の共通 UI・アクセシビリティ文言

| 箇所 | 固定言語 | 文言 |
| --- | --- | --- |
| `frontend/src/app/not-found.tsx` | 英語 | `Page Not Found`、説明、`Back to Home` |
| `frontend/src/components/ui/ErrorState.tsx` | 日本語 | 既定の `もう一度試す`、`戻る` |
| `frontend/src/lib/apiClient.ts` | 日本語 | 5xx の汎用エラー |
| `frontend/src/app/notifications/page.tsx` | 日本語 | `aria-label="未読"` |
| `frontend/src/app/[book]/page.tsx` | 日本語 | `aria-label="読書中"` |
| `frontend/src/app/profile/[username]/page.tsx` | 日本語 | 記事タブ |
| `frontend/src/components/reader/CommentPanel.tsx` | 日本語 | 引用記事タブ |

### 1.5 箇所ラベルはバックエンドで日本語形式に固定

`backend/comments/serializers.py` の `_format_location_label()` は、常に `書名 N章 M節` を作る。これを次の画面がそのまま表示するため、英語 UI でも `章`／`節` が残る。

- `frontend/src/components/qa/QACard.tsx`
- `frontend/src/app/page.tsx` の最近の Q&A とトレンド

さらに、ラベルの書名は投稿時の `source_translation` の DB 書名なので、UI 言語ではなく投稿者が見ていた版の言語になる。`frontend/src/lib/i18n.ts` には `formatBookLocation()` があり、プロフィールとお気に入りでは正しく使われているため、同じ箇所でも画面によってローカライズ有無が異なる。

### 1.6 削除済みコメントの表示言語が機能ごとに不統一

| 機能 | 固定言語 | 定義 |
| --- | --- | --- |
| 通常コメント・通知・コメントのお気に入り | 英語 | `backend/comments/models.py` の `DELETED_COMMENT_BODY` |
| 翻訳プロジェクトコメント | 日本語 | `backend/translations/serializers.py` の `display_body` |
| 記事コメント | 日本語 | `backend/articles/serializers.py` と `frontend/src/components/articles/ArticleComments.tsx` |

通常の Q&A カードは `is_deleted` を見て共通辞書の `t.deletedComment` に差し替えるため日英対応済み。しかし、通知本文スニペットや削除済みコメントのお気に入りはバックエンド文字列をそのまま表示し得る。

## 2. API エラー文言

API は UI 言語、`Accept-Language`、言語パラメータのいずれでもエラー文言を切り替えていない。英語固定、日本語固定、日英混在のエンドポイントがある。`apiClient.ts` は4xxでバックエンドの文言を `ApiError.message` に入れ、画面によってはそのまま表示する。

### 英語固定

- `backend/users/views.py`: ログイン失敗、ユーザー未検出、refresh token 関連
- `backend/users/authentication.py`: CSRF 失敗
- `backend/bookmarks/views.py`: 対象未指定、重複お気に入り
- `backend/bible/views.py`: 不明な書、本文データなし
- `backend/comments/serializers.py`: 本文必須・長さ、対象指定、Q&A 題必須、返信先不一致
- `backend/comments/views.py`: 投票、削除済み編集、ベストアンサー、通報
- `backend/translations/views.py`: 参加申請、メンバー状態、権限、担当者、`book_id` 必須など大部分

### 日本語固定

- `backend/articles/serializers.py`: 記事・要約・タグ・記事コメントの validation
- `backend/translations/serializers.py`: 重複ユニット、削除済み翻訳コメント
- `backend/translations/views.py`: 非公開プロジェクトの本棚追加・閲覧
- `backend/reading_progress/views.py`: `book, chapter は必須です。`
- `frontend/src/lib/apiClient.ts`: 5xx の汎用文言

これは「日英の文言セットの不足」だけでなく、API レベルに言語選択の仕組みがないことが根本原因。

## 3. SEO、PWA、文書言語

### 3.1 英語メタデータしかない

次のメタデータは英語のみ。

- `frontend/src/app/layout.tsx`: 既定 description、Open Graph、Twitter
- `frontend/src/app/manifest.ts`: PWA description
- `frontend/src/app/about/page.tsx`
- `frontend/src/app/terms/page.tsx`
- `frontend/src/app/privacy/page.tsx`
- `frontend/src/app/guidelines/page.tsx`
- `frontend/src/app/licenses/page.tsx`
- `frontend/src/app/feedback/page.tsx`
- `frontend/src/app/[book]/layout.tsx`
- `frontend/src/app/[book]/[chapter]/layout.tsx`
- `frontend/src/app/not-found.tsx`

本文は日英対応済みの規約・ポリシーページでも、title/description は英語だけ。

### 3.2 文書言語は日本語に固定

`frontend/src/app/layout.tsx` は常に `<html lang="ja">`。言語切替は `frontend/src/contexts/LanguageContext.tsx` で `localStorage` と React state だけを変更し、`document.documentElement.lang`、URL、cookie、サーバー側 locale は変更しない。

その結果:

- 英語 UI でもスクリーンリーダー・ブラウザには日本語文書として伝わる
- サーバー生成メタデータが現在の UI 言語を知れない
- Open Graph は `locale: "en_US"`、HTML は `lang="ja"` で不一致

## 4. 本文データの日英カバレッジ

`backend/bible/data/canonical_books.json` を、`口語訳`／`文語訳` を日本語、`KJV`／`*(EN)` を英語として集計した。

- 全96書
- 日英あり: 66書
- 英語のみ: 30書
- 日本語のみ: 0書
- 日英どちらもない（原文のみ）: 0書

### 4.1 英語本文のみの30書

#### 福音書・初期キリスト教文書・断片（14書）

1. `mary` — マリアの福音書
2. `infancy-thomas` — トマスによる幼児福音書
3. `peter` — ペテロの福音書
4. `judas` — ユダの福音書
5. `philip` — フィリポの福音書
6. `truth` — 真理の福音書
7. `secret-james` — ヤコブの秘密の書
8. `stranger` — 救い主の対話
9. `secret-mark` — マルコの秘密の福音書
10. `quelle` — Q資料
11. `thomas` — トマスの福音書
12. `poxy5575` — P.Oxy. 5575
13. `egerton` — エガートン福音書
14. `infancy-james` — ヤコブ原福音書

#### 旧約偽典（2書）

15. `enoch` — エノク書
16. `adam-and-eve` — アダムとエバの生涯

#### 第二正典・LXX 関連（14書）

17. `tobit` — トビト記
18. `judith` — ユディト記
19. `wisdom` — 知恵の書
20. `sirach` — シラ書
21. `baruch` — バルク書
22. `epistle-of-jeremy` — エレミヤの手紙
23. `susanna` — スザンナ
24. `bel-and-the-dragon` — ベルと竜
25. `1-maccabees` — マカバイ記一
26. `2-maccabees` — マカバイ記二
27. `1-esdras` — エズラ第一書
28. `prayer-of-manasseh` — マナセの祈り
29. `3-maccabees` — マカバイ記三
30. `4-maccabees` — マカバイ記四

96書すべてに日本語の `name`／`short` と英語の `englishName` はあるため、足りないのは書名メタデータではなく本文。

### 4.2 名前付き章見出し247件は英語のみ

`frontend/src/lib/books.ts` の `chapterTitles` は単一配列で、言語別フィールドではない。13書・247件がすべて英語で、日本語 UI でも英語見出しが出る。

| slug | 見出し数 |
| --- | ---: |
| `mary` | 5 |
| `infancy-thomas` | 19 |
| `peter` | 14 |
| `judas` | 7 |
| `thomas` | 115 |
| `poxy5575` | 2 |
| `egerton` | 4 |
| `infancy-james` | 25 |
| `philip` | 18 |
| `truth` | 16 |
| `secret-james` | 12 |
| `secret-mark` | 5 |
| `stranger` | 5 |

`quelle` は英語本文のみだが、章見出し配列を持たないためこの表には含まれない。

## 5. デモ・静的成果物

本番機能と分けるべきだが、リポジトリ内の表示可能な成果物としては片言語固定。

- 日本語中心: `frontend/src/app/demo/page.tsx`
- 日本語中心: `frontend/src/app/demo/home/page.tsx`
- 日英混在だが切替なし: `frontend/src/app/demo/ui/page.tsx`
- 日本語中心: `frontend/public/demo.html`
- 日本語中心: `frontend/public/demo-cards.html`
- 日本語中心: `demo-top.html`
- 日本語中心: `plan/launch-strategy.html`

## 6. ドキュメント

開発ドキュメントは必ずしも二言語化対象ではないが、リポジトリ全体の片言語版として次を確認した。

- `README.md`: 英語のみ
- `frontend/README.md`: 英語のみ（create-next-app の既定文書）
- `docs/codebase-guide.md`: 日本語のみ。ルート README からも `Codebase Guide (in Japanese)` と明記してリンク
- `canon-and-translations-progress.md`: 日本語のみ
- `backend/bible/seed/ibibles/README.md`: 日本語のみ
- `plan/` の計画・設計文書: 日本語中心で、英語版はない

`backend/common/management/commands/seed.py` と `seed_en.py` は両方存在する。ただし一対一の翻訳ではなく、英語シードの方が件数が多い（例: users 30対15、verse comments 36対20）。「片方しかない」には該当しないが、デモ内容の完全な日英同等性はない。

## 7. 日英対応済みと確認できた範囲

- `frontend/src/lib/i18n.ts`: トップレベル 357キーずつ、差分0。`en: typeof ja` によりキー欠落は型検査でも検出される
- `tagNames`: 5キーずつ、差分0
- `genreNames`: 7キーずつ、差分0
- `frontend/src/lib/translations.ts`: 登録済み聖書版12件に日英表示ラベルあり
- `frontend/src/lib/books.ts`: 96書すべてに `name`、`short`、`englishName` あり
- About 本文: 共通辞書経由で日英あり
- Terms、Privacy、Guidelines、Licenses、Feedback の本文: 各 Content component に日英あり
- 正典66書の本文: 日本語・英語ともあり
- Q&A 定義済みタグ: 日本語 DB 名から英語 UI ラベルへの対応あり
- お気に入りと自分のプロフィールの箇所表示: `formatBookLocation()` 経由で日英あり

## 8. 修正優先順位案

1. 記事機能の文言・記事タグを共通 i18n へ移す
2. `formatRelativeTime()` を廃止または言語引数対応し、`useRelativeTime()` に統一する
3. 箇所ラベルと削除済み文言を API の完成文ではなく構造化データとして返し、フロントで翻訳する
4. API エラーをコード化し、フロントで日英文言へ変換する
5. `html lang` とメタデータが選択言語に追随できる locale 設計を入れる
6. `chapterTitles` を `{ ja, en }` 化する
7. 英語本文のみ30書について、日本語訳の調達可否・ライセンス・優先順位を別途決める
8. 本番外のデモと公開ドキュメントを二言語化するか、非対象であることを明示する

## 9. 監査方法

- TypeScript Compiler API で、JSX text、表示用 attribute、表示用 object property、`setError`／toast の文字列を抽出
- `i18n.ts` の `ja`／`en` オブジェクトキー、ネストした `tagNames`／`genreNames` を AST で比較
- `books.ts` を AST で調べ、96書の必須表示名と `chapterTitles` の言語・件数を集計
- `canonical_books.json` を訳ID別に集計し、日英本文の有無を96書すべて判定
- Django の `ValidationError`、例外、`detail` response、削除済み表示を横断検索
- 実運用画面と `useT()`／`useLang()`／`formatRelativeTime()`／`location_label` の利用箇所を逆引き

この監査は「文字列が存在するか」だけでなく、実際に選択中の UI 言語へ切り替わる経路があるかまでを判定した。
