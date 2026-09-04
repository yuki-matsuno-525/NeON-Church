# NeON Church リリース品質監査・根本修正バックログ

- 作成日: 2026-09-05
- 対象ブランチ: `codex/all-features-bug-audit`
- 対象worktree: `C:\Users\ymats\NeON-Church-all-features-bug-audit`
- 基準コミット: `abfefac`
- 状態: 実行待ち（本書のチェック項目はまだ完了していない）

## 1. 目的

NeON Church の全機能を、フロントエンド、バックエンド、データ、セキュリティ、運用、法務の各面から検証し、公開サービスとしてリリース可能な品質まで引き上げる。

既存テストの成功を品質の証明とはみなさない。既存テストが再現できない実ブラウザ動作、本番PostgreSQL、並行実行、障害、長時間稼働、外部サービス、データ移行、バックアップ復元、アクセシビリティ、性能、法務上の問題も監査対象とする。

修正は場当たり的な条件分岐や例外の握り潰しで済ませない。再現テストと根本原因分析を先に行い、責務分離、明確な契約、DB不変条件、標準的なフレームワーク利用、テスト容易性を満たす恒久修正を行う。

## 2. 絶対条件

### 2.1 判定は厳格に行う

- 「一応動く」「再試行で通る」「警告だけ」「手元では再現しない」は合格にしない。
- 未調査、未説明のskip/xfail、flake、quarantine、retry救済、未定義の警告を残した状態はNo-Goとする。
- P0、P1、P2の確認済み不具合は原則すべて解消する。P3のみ、影響、回避策、恒久対応、担当、期限、検知方法を記録した場合に限り残余リスクとして判断できる。
- セキュリティ、プライバシー、認証認可、データ損失、法務、主要導線、WCAG、視覚回帰に関する未解決事項は重要度にかかわらずNo-Goとする。
- 検証証拠がない項目を推測で合格にしない。

### 2.2 デザイン、UI/UX、世界観を凍結する

- リブランド、配色変更、レイアウト再設計、余白の全面調整、文言トーン変更、コンポーネントライブラリへの置換は行わない。
- 最初に現行画面のdesktop/mobile、日英、匿名/認証済み、主要状態を承認用ゴールデン画像として固定する。
- 通常の内部修正では意図しない視覚差分ゼロを必須とする。
- WCAG 2.2 AA、法務、安全性など明確な基準を満たすために必要な場合だけ、最小限の外観変更を認める。
- アクセシビリティ修正はsemantic HTML、名前・役割・値、ARIA、フォーカス、キーボード操作など、見た目を変えない方法を最優先する。
- 色、サイズ、余白等の変更が避けられない場合は、該当する基準番号、失敗証拠、代替案、変更前後画像、影響範囲を記録する。
- 主要導線の操作手順増加、意味の変化、反応速度低下、スクロール/フォーカス悪化はリリースブロッカーとする。

### 2.3 ソフトウェア設計を劣化させない

- 各不具合は「再現 → 特性化テスト → 根本原因 → 設計判断 → 恒久修正 → 回帰確認」の順で処理する。
- 同じ認証、公開範囲、状態、エラー変換、API transportを複数箇所へコピーしない。
- フレームワークの標準的な拡張点を優先し、独自機構を増やす場合はADRで理由を残す。
- 暫定回避策は恒久対応、担当、期限、撤去条件、監視方法がなければ導入しない。暫定対応のみでリリース合格にしない。
- 単純CRUDに過剰な抽象化を導入しない。一方、複数モデル更新、状態遷移、外部副作用、認可規則は適切な境界へ分離する。
- 大規模な一括書き換えは避け、外部動作を特性化したうえで小さな縦切り単位に改善する。

### 2.4 `main` と他作業を保護する

- 元worktree `C:\Users\ymats\NeON-Church` および `main` は編集、checkout、commit、pushしない。
- 現在`main`にある未コミット変更は読み込まず、コピーせず、上書きしない。
- 監査開始時点では、聖書版/参照API、記事引用、読書画面、プラン、i18n等に未コミット変更がある。監査ブランチと重なる可能性があるため、コミットされるまで追従しない。
- 各Stepの開始時と終了前に `main` と `origin/main` の進行を読み取り確認する。
- `main`側の変更がコミットされた節目で、監査ブランチへ通常のmergeで取り込む。強制pushと履歴書き換えは行わない。
- 競合は監査worktree内だけで解消し、最新`main`の意図を優先する。意図が判断できない競合はユーザー確認まで保留する。
- 最終Go/No-Goは最新のコミット済み`main`を統合してから全検証をやり直す。
- 小さく説明可能なコミットを作り、`codex/all-features-bug-audit` だけをpushする。`main`へのmergeは明示依頼なしに行わない。

## 3. 現在の基準値と既知の監査シグナル

2026-09-05、`abfefac`での初回測定結果。これは不具合件数の確定ではなく、計画作成用の基準値である。

- フロントエンドは35画面、TypeScript/TSX約28,352行。
- フロント単体テストは77ファイル、実測446件が成功した。
- ESLintとNext.js本番buildは成功した。
- Vitest終了時に多数のFetch `AbortError` が出力された。テストは成功扱いだが、未完了非同期処理またはteardown不備として調査する。
- Vitestは`happy-dom`であり、レイアウト、実フォーカス、Cookie、履歴、Hydration、BFCache、ブラウザ固有動作の証明にはならない。
- Playwrightは17 specでChromium中心。Firefox、WebKit、視覚回帰、axe、オフライン、低速通信、IME、ズーム、画面回転は未網羅。
- 35画面中11画面には画面単位テストがない。公開動的画面と編集画面も含まれる。
- `translations/[id]/page.tsx`、`apiClient.ts`等に大きな責務集中がある。行数だけで不具合とは断定せず、状態遷移と変更理由を見て分割要否を判断する。
- バックエンドはAPI URL宣言が約108〜111件、アプリケーションコード約12,042行。
- バックエンドテストは677件成功、13件skip、所要約9分40秒。
- 通常テストはSQLiteで、本番はPostgreSQL 16。PostgreSQL固有制約、ロック、照合、extension、クエリ計画は通常テストで証明されていない。
- 既存`APIClient`はCSRF強制検査を有効にしていないため、Cookie認証時の実CSRF経路は別fixtureで検証が必要。
- OpenAPI生成は58種類のエラー、103種類の警告を含みながら終了コード0だった。現在のCIは不完全なAPI契約を見逃す。
- `openapi-typescript`は存在するが生成型が利用されず、手書きAPI型が中心である。
- npm auditは11件（low 1、moderate 1、high 9）。直接依存のNext.jsも対象であり、リリース前に更新と回帰確認が必要。
- ローカルNode 20.18.1、CI/Docker Node 22で、`engines`や`packageManager`による固定がない。
- Pythonは直接依存のみ固定され、推移依存のlock/hash固定がない。
- Redis未設定時はLocMemCacheとなり、複数workerでスロットルとcacheを共有できない。`REDIS_URL`を設定すると必要パッケージ不足で起動不能になる可能性がある。
- Docker backendはroot実行で、Web起動時に`migrate`を行う。複数instance起動時の競合、release job、graceful shutdown、healthcheckを検証していない。
- E2EはPostgreSQLを使うがdev settingsかつ限定データで、本番設定・全本文・全importer・旧DBからのupgradeを検証していない。
- 本文データは複数箇所に重複正本があり、現在hashが一致しても将来のdriftを防げない。
- importは既存本文の訂正や削除をdesired stateへ反映せず、未登録や0件を警告/skipで成功扱いする経路がある。
- backup/restore/PITR/rollback runbookと定期復元試験がない。
- メールは同期送信または`fail_silently`経路があり、永続outbox、再送、DLQ、配送監視がない。
- ライセンス画面の断言、実データの出典証拠、repoのLICENSE、画像creditの間に未確認/不一致がある。法務確認前はNo-Goとする。

## 4. 適用する外部基準

- OWASP Application Security Verification Standard 5.0 Level 2: <https://owasp.org/www-project-application-security-verification-standard/>
- OWASP API Security Top 10 2023: <https://owasp.org/www-project-api-security/>
- WCAG 2.2 Level AA: <https://www.w3.org/TR/WCAG22/>
- Core Web Vitalsのgood基準（LCP 2.5秒以下、INP 200ms以下、CLS 0.1以下を75パーセンタイルで評価）: <https://web.dev/articles/defining-core-web-vitals-thresholds>
- Django 5.2、Django REST Framework 3.16、Next.js 16、React 19、PostgreSQL 16の実装時点の公式ドキュメントと非推奨情報。

基準を満たすことと、実際の利用者体験が良いことを別々に確認する。自動ツールのスコアだけで適合を宣言しない。

## 5. 監査台帳

Step 1で `docs/release-audit/` 以下に次の台帳を作る。

### 5.1 機能・証跡マトリクス

各行に以下を持つ。

- 機能ID、画面、API path/method、バックエンドview/service/model。
- 利用者、役割、所有権、公開状態、ライフサイクル状態。
- 入力、出力、副作用、外部サービス、永続データ。
- 成功、空、部分成功、失敗、再試行、競合時の期待結果。
- unit、component、API integration、contract、E2E、manual、security、performanceの各テストID。
- 既知の設計判断、データ不変条件、監視項目。

### 5.2 Findings台帳

各不具合/リスクに以下を必須とする。

- Finding ID、発見手法、日時、対象release SHA。
- P0〜P3、影響範囲、悪用/発生可能性、利用者影響。
- 再現環境、最小再現手順、期待値、実際値、ログ/trace/画像。
- 根本原因。表面的な発生箇所だけで終えない。
- 追加した失敗テストと、既存テストが見逃した理由。
- 設計上の修正方針、変更範囲、互換性、migration/rollback。
- 修正commit、検証結果、残余リスク、close根拠。

### 5.3 ADR

次のような横断判断は、局所修正前にADRを作る。

- Cookie JWTを維持するかDjango sessionへ寄せるか。
- 即時session失効とrefresh token再利用検知。
- 認可/公開範囲の単一policy。
- APIエラー形式とOpenAPIを正とする型生成。
- 複数モデル状態遷移のservice境界。
- メール/通知のtransactional outbox。
- 本文正本、content manifest、import/reconcile方式。
- deploy、migration、rollback、backupの単一標準経路。

## 6. 機能と状態の網羅範囲

### 6.1 機能群

1. トップ、About、Guidelines、Privacy、Terms、Licenses、Feedback。
2. 聖書/文献一覧、書、章、節、版切替、前後移動、今日の聖句、再開。
3. 検索、pagination、関連箇所、0件、大量結果。
4. 登録、login、logout、refresh、password変更/再設定。
5. Google/GitHub OAuth、callback、既存account連携。
6. 自分/他人のprofile、公開範囲、設定、session一覧/失効、account削除。
7. コメント、返信、編集、論理削除、vote、通報、moderation。
8. Q&A、回答、best answer、tags、report。
9. bookmark、bulk bookmark、公開/非公開一覧。
10. notifications、未読数、既読、preferences、メール通知。
11. reading progress、匿名localStorage、認証後の保存/統合。
12. 翻訳project、作成、参加申請、承認/拒否、member、assign、unit、comment、publish/unpublish、library、read。
13. articles、下書き、autosave、citation、公開/unlisted、comment、edit/delete。
14. reading plans、作成/編集、days/readings、購読、中止、再開、progress。
15. health/schema/admin、seed、全importer、canonical/edition/content data。
16. metadata、robots、sitemap、manifest、OGP、i18n、PWA、security headers。
17. build、container、deploy、migration、monitoring、backup/restore、incident response。

### 6.2 利用者・権限軸

- 匿名、正常な認証済み、本人/所有者、他人。
- staff/superuser、inactive、削除中/削除済み利用者。
- 翻訳owner、pending/rejected/approved member、除名後member。
- 記事/翻訳/planのpublic、unlisted、private、draft、active、published、deleted。
- cookieなし、不正access、期限直前/期限切れaccess、refreshのみ、不正/再利用refresh。

権限境界、公開範囲、破壊操作はpairwiseで省略せず、意味のある全組み合わせを試す。

### 6.3 データ・入力軸

- 0件、1件、ページ境界、最大件数、大量、重複、古いデータ、論理削除、orphan候補。
- 最小/最大、最大±1、0、負数、巨大整数、不正UUID、巨大page/page_size。
- 空、空白のみ、改行、タブ、NULL byte、制御文字、ゼロ幅文字。
- 日本語IME、絵文字、結合文字、サロゲート、RTL/Bidi、Unicode normalization。
- HTML/Markdown風入力、極端に長い単語/URL、壊れたJSON、不正Content-Type、未知/重複field。
- source data欠落、0件parse、重複章節、意図的gap、第0章、checksum差異。

### 6.4 通信・ライフサイクル軸

- 200/201/204、400、401、403、404、409、410、429、500/502/503。
- 空body、非JSON、partial response、timeout、切断、遅延、応答順逆転。
- 二重click、連打、戻る/進む、reload、直接URL、タブclose、pagehide、BFCache、複数tab。
- 低速中のnavigation、POST成功後の古いGET、optimistic rollback、logout中polling。
- DB/Redis/SMTP/OAuth停止、429、不正応答、process kill、deploy中request。

### 6.5 表示環境軸

- Chromium、Firefox、WebKit。
- 320、360、375、390、640、768、769、820、900、1024、1280、1440px。
- mobile縦横、safe area、soft keyboard、200%/400% zoom。
- reduced motion、forced colors、keyboard only、screen reader。
- 日本語/英語、SSR時とhydration後の言語一致。

主要/高リスク組み合わせは全件、それ以外は境界値分析、同値分割、pairwiseを使って削減する。削減理由をマトリクスへ残す。

## 7. 組み合わせるテスト手法

単一手法に依存せず、同じ重要仕様を異なる観点とoracleで確認する。

| 手法 | 主目的 | 主な候補 |
|---|---|---|
| 静的解析 | 到達前の欠陥、危険API、型/規約違反 | ESLint、TypeScript、Ruff、mypy段階導入、Bandit、Semgrep |
| Unit/characterization | 純粋ロジック、現在仕様の固定 | Vitest、pytest |
| Component | UI状態とinteraction | Testing Library、必要箇所は実browser component test |
| API integration | serializer、permission、DB、副作用 | DRF APIClient、CSRF強制fixture、PostgreSQL |
| Contract | front/backの実契約 | OpenAPI、生成型、Spectral、Schemathesis、openapi-diff |
| Property-based | 例示テスト外の入力空間 | Hypothesis、fast-check |
| Model/state-machine | 長い操作列と不正遷移 | Hypothesis RuleBasedStateMachine、明示reducer/state model |
| Concurrency | lost update、二重作成、順序競合 | PostgreSQL別connection、Barrier、stress反復 |
| Mutation | テストが本当に欠陥を検出するか | mutmut/Cosmic Ray、Stryker |
| Fuzz/negative | 壊れた入力、未定義5xx、DoS境界 | Schemathesis、payload generator、DAST |
| Browser E2E | 実Cookie、履歴、focus、layout、hydration | Playwright Chromium/Firefox/WebKit |
| Visual regression | 世界観/外観の凍結 | Playwright screenshot、固定seed/時刻/font |
| Accessibility | WCAG実適合 | axe、keyboard、NVDA/Firefox、VoiceOver/Safari相当 |
| Exploratory | 仕様書/テスト実装者の盲点 | 90分charter、独立担当、動画/trace |
| Performance | p95/p99、N+1、容量、劣化 | Lighthouse CI、k6/Locust、pg_stat_statements、EXPLAIN |
| Reliability/chaos | 依存障害と復旧 | Toxiproxy等、process kill、provider fake |
| Supply chain | 既知脆弱性、secret、image、SBOM | npm/pip audit、OSV、gitleaks、Trivy/Grype、Syft |
| Migration/DR | 実データupgrade、復元、rollback | django-test-migrations、pg_dump/pg_restore、PITR rehearsal |
| Legal/content audit | 出典、license、本文完全性 | content manifest、hash、BOM、一次資料の人手確認 |

重要機能は、コードを読むwhite-box担当、公開契約だけを見るblack-box担当、既存テストを読まずに操作するexploratory担当を分ける。実装と同じロジックをテスト側へ複製し、誤りを同時に再現することを避ける。

## 8. 標準設計の目標

### 8.1 フロントエンド

- Next.js App RouterではServer Componentを標準とし、browser interactionが必要な部分だけをClient boundaryにする。
- `page.tsx`は取得、権限判断、画面構成を中心とし、大きな状態遷移とmutation orchestrationを分離する。
- API transportを一つにし、CSRF、refresh single-flight、language、error変換、AbortSignal、request IDを集中管理する。
- transportを複製せず、機能別API moduleへ分割する。
- OpenAPI生成型を正とし、手書き型との差異をなくす。
- loading、empty、partial、error、retryを明示的に区別する。API障害を空配列へ変換して隠さない。
- 複雑な非同期画面はreducer/state machine/controllerで遷移を明示し、古いrequestが新しい状態を上書きしない。
- mutationの二重送信、optimistic rollback、navigation/pagehide、multi-tabを一貫して扱う。
- 実装時は `node_modules/next/dist/docs/` のNext.js 16該当ガイドを必ず確認する。

### 8.2 バックエンド

- Serializerは外部入力と表現、Permissionは実行者、QuerySet/selectorは可視範囲、domain serviceは複数モデル更新/状態遷移/副作用、DB constraintは常時成立する不変条件を担当する。
- list/detail/count/search/bookmark/notification等の全経路で同じ公開範囲policyを利用する。
- confidential objectは存在有無を漏らさないstatus/error/時間特性を定義する。
- DBで表現できる不変条件はCheck/Unique/Exclusion等のconstraintを最終防衛線にする。
- cross-table不変条件はtransaction内のserviceで検証し、admin/import/migrationも同じ経路またはstrict auditを通す。
- 状態変更は許可された遷移表を持つcommand/serviceだけを通す。
- `transaction.atomic`、必要箇所の`select_for_update`、F式、optimistic versionを使い分ける。
- 外部通知はDB commit後にoutboxへ積み、HTTP request中の同期副作用を避ける。
- 例外を中央で定義済みのAPI errorへ変換し、予期しない例外を握り潰さない。

### 8.3 データ・運用

- dev/staging/prodを分離し、同一immutable artifactをstagingからproductionへpromoteする。
- build、migration、content reconcile、Web起動を別責務にする。migrationは単一release jobで一度だけ実行する。
- 環境変数schemaを用意し、不完全なOAuth/SMTP/Redis/URL/production settingsをfail-fastにする。
- 本文は単一正本とversioned content manifestを持ち、source/license/hash/期待件数/例外を記録する。
- importは`--check`、`--dry-run`、`--apply`を持つreconcile処理とし、skip/0件/checksum差異を成功扱いしない。
- backupは存在確認で終えず、別DBへのrestoreと整合性/主要導線確認まで自動化する。
- 手動console作業を標準運用にしない。必要な操作はversion管理したcommand、dry-run、監査logを通す。

## 9. 実行バックログ

各Stepは独立した品質ゲートである。トップレベルcheckboxは、完了条件をすべて満たし、Step 10の共通完了手順を実施するまでチェックしない。

### [ ] Step 0 — 作業隔離、基準線、デザイン凍結

実施内容:

- `main`/`origin/main`/監査branchのSHA、dirty状態、未統合範囲を記録する。
- Node 22、npm、Python 3.13、PostgreSQL 16、browserの標準versionを決め、`engines`、`packageManager`、runtime file、container等で固定する。
- 再現可能な安定seed、固定時刻、固定font、固定localeを用意する。
- 全35routeの代表状態について現行UIのゴールデン画像と操作動画を保存する。
- page error、console error/warn、unhandled rejection、意図しないrequest failure、hydration mismatchをE2E失敗へ変換するfixtureを作る。
- retryは証跡採取専用とし、初回失敗を合格にしない。
- 現行CIとローカルの同一commandを定義する。

完了条件:

- 同じSHAとseedでデータ、時刻、画像が再現できる。
- 主要導線が連続10回、retryなしで初回成功する。
- 現行デザインbaselineが固定され、意図しない差分を機械検出できる。
- 元`main`の未コミット変更に影響を与えていない。

### [ ] Step 1 — 全機能・API・権限・設計の追跡マトリクス

実施内容:

- Django URL resolverとNext routeから全endpoint/画面を機械抽出する。
- 6章の全機能について、actor × ownership × visibility × state × data × failure × platformを列挙する。
- 既存unit/E2Eを各セルへ紐付ける。テスト名があるだけでなくassert内容まで確認する。
- 未試験、片側のみ試験、誤ったoracle、mock過多、実装詳細依存、false positive候補を明示する。
- current 13 skipを1件ずつ理由・本番影響・解除方法で分類する。
- STRIDE、ASVS 5.0 Level 2、API Security Top 10をendpoint/assetへ紐付ける。
- trust boundary、data flow、個人情報、secret、外部provider、破壊操作を図示する。
- 責務集中、循環依存、重複policy、例外握り潰し、暗黙stateを設計台帳へ記録する。
- Findings台帳、ADR template、test evidence templateを作る。

完了条件:

- 全35画面、全API method、全user operation、全永続modelがマトリクスに存在する。
- すべてのセルがtest ID、署名付きmanual check、または明示した未検証riskのいずれかを持つ。
- 「既存テストがあるため未調査」が0件。
- P0/P1仮説が優先順と依存関係を持つ。

### [ ] Step 2 — 多層テスト基盤とCI品質ゲート

実施内容:

- SQLiteは高速unit補助として残し、PostgreSQL 16でbackend integration全体を実行するPR jobを追加する。
- pytest branch coverage、random order、repeat、timeout、slow markerを導入する。
- Vitest coverage、明示typecheck、browser依存test層を導入する。
- `APIClient(enforce_csrf_checks=True)` fixture、複数actor、別DB connection、Barrier、provider failure fake、固定時刻を整備する。
- PlaywrightをChromium/Firefox/WebKitへ拡張し、critical/extended/nightlyを分離する。
- axe、visual regression、Lighthouse CI、property/state-machine/mutation testの標準commandを用意する。
- npm/Python/container/action/secret/SAST/SBOM scanをCIへ追加する。
- warning、skip、flake、retry、coverage低下、生成差分をfailさせる。
- GitHub Actionsのpermissions、action pin、artifact retention、trace/report保存を監査する。

完了条件:

- PRで高速必須gate、nightlyで全量gateを再現できる。
- critical testのskip/xfail/quarantine/retry救済が0。
- random/repeatでflake 0。
- overall statements/functions 90%以上、branches 85%以上を最低線とする。
- auth、permission、visibility、destructive operation、state invariant、API transportの重要分岐は100%を目標とする。
- 差分coverage 95%以上。
- 重要module mutation score 90%以上、その他対象80%以上。認可/公開範囲に意味のあるsurvivor 0。

### [ ] Step 3 — OpenAPI契約、HTTP意味論、front/back型整合

実施内容:

- 全APIView/GenericViewにrequest/response/error serializer、status、auth、permissionを明示する。
- Cookie JWT用OpenAPI authentication extensionを追加する。
- read/write、nullable、enum、pagination、204、error responseを正確に表す。
- serializer name collisionとcomputed field型を解消する。
- OpenAPI生成error/warningを0にし、CIでfail-on-warningを有効化する。
- Spectral等のlint、Schemathesisの全operation生成test、openapi-diffの破壊変更検査を加える。
- frontend生成型をcompileし、手書き型を段階的に置換する。
- frontendが送るquery、Cookie、CSRF、language、content typeと実APIをcontract testする。
- 204/empty/non-JSON/partial/pagination終端/重複/順序/未知fieldを試す。
- `code/message/fields/request_id`等の標準error契約をADRで決め、外観を変えない互換adapterで移行する。

完了条件:

- OpenAPI unique error 0、warning 0、全operation収録。
- Schemathesisで未定義5xx、schema逸脱、機密漏洩0。
- 生成型差分0、frontend typecheck成功。
- 既存UIの表示、文言、操作、視覚baselineに意図しない差分0。

### [ ] Step 4 — 認証、CSRF、CORS、OAuth、session安全性

実施内容:

- Cookie JWT維持/Django session移行を脅威、UX、運用、移行コストでADR判断する。
- CSRF失敗、token不正、匿名を区別し、login/register/logout/refreshを含むcookie変更requestを実検証する。
- trusted/untrusted/null Origin、preflight、credential、safe/unsafe methodを検査する。
- Secure/HttpOnly/SameSite/Path/Max-Age、cache control、token漏洩を検査する。
- refresh single-use、同時refresh、rotation、再利用検知、access即時失効、multi-tabを検証する。
- 登録/identity/password resetで同じpassword validator、username/email normalization、一意性を使う。
- email重複の既存データ監査と安全なmigrationを行う。
- OAuth verified email、state一回限り、PKCE要否、既存account link時再認証、並行callbackを検討/実装する。
- Google/GitHubのdeny、timeout、429、5xx、不正JSON、claim欠落、非公開email、部分設定を試す。
- account enumerationを本文、status、時間差、メール副作用で検査する。
- password変更/session失効/account削除の全token/全tabへの意味をUI契約と一致させる。
- Redisを本番必須の共有throttle/cacheとして構成し、IP/account別abuse controlを確認する。

完了条件:

- ASVS認証/session項目の適用対象100%にtestまたは設計証跡がある。
- CSRF/CORS/cookie/authの全境界で未定義挙動0。
- account takeover、enumeration、token再利用、失効後利用0。
- 認証critical state-machine/mutation test合格。
- login/register等の既存UI/UXと世界観に意図しない差分0。

### [ ] Step 5 — 認可、公開範囲、プライバシー、moderation

実施内容:

- 匿名/本人/他人/staff/inactiveと、各所有権/公開状態を全API methodで交差試験する。
- list/detail/count/search/bookmark/notification/citation/profileの全経路で同じvisibility policyを使う。
- confidential objectのmissing/malformed/unauthorizedで存在、件数、本文、処理時間を漏らさない。
- draft/unlisted/private/published/deletedの仕様を明文化する。
- article unlistedとcomment、翻訳member一覧/pending情報、削除済みcomment/Q&A、best answer、report、voteを重点検証する。
- owner/member変更、除名後assignment、account削除後所有contentの扱いを確定する。
- 論理削除した本文だけでなくreply count、vote count、notification、search index、bookmarkからの漏洩を調べる。
- abuse、spam、mention fan-out、rate limit bypass、moderation audit trailを検査する。

完了条件:

- authorization/visibility matrixの意味ある全組み合わせが自動test済み。
- object/list/count/search/timing経由の情報漏洩0。
- permission/visibility branch coverage 100%、意味のあるmutation survivor 0。
- P0/P1/P2の認可/公開範囲finding 0。

### [ ] Step 6 — DB不変条件、状態遷移、競合、データ整合性

実施内容:

- PostgreSQLで全modelの不変条件を機械抽出し、API/admin/import/migrationの全入口を確認する。
- ReadingProgressのbook/chapter所属、Translationのproject/book/verse/member/unit、Notification対象、Plan subscription/day/reading/progress、Question/best answer、Article citation、Bookmark対象等のcross-table整合を検査する。
- 章/節/日番号の0/負数、NULL対称性、start<=end、重複、所属一致をconstraint/serviceで保証する。
- translation、plan、article、comment等の許可遷移表を作り、state-machine testと実装で共有する。
- 別connectionとBarrierでrefresh、同時登録、bookmark、vote、best answer、plan day、translation join/assign/edit/publish、account deletion等を決定的に競合させる。
- lost update、duplicate、上限超過、partial commit、通知重複を防ぐ。
- optimistic concurrency/versionと409、pessimistic lock、F式、idempotency key/PUT semanticsを用途別に選ぶ。
- IntegrityErrorをatomic境界外で期待する400/409へ変換し、未知の500と混同しない。
- `audit_data_integrity --strict --json`を作り、production read-onlyでも同じ不変条件を検査できるようにする。
- account削除時のCASCADE/保持/匿名化をprivacy policyと合わせる。

完了条件:

- PostgreSQL strict integrity audit違反0。
- 競合反復でduplicate、lost update、不整合、未定義500、二重副作用0。
- invariant/state/transactionの重要branch 100%。
- admin/import/migration経由でも不正状態を作れないか、即座に検出できる。

### [ ] Step 7 — 全フロント機能、非同期状態、実ブラウザ探索

実施内容:

- 6.1の各機能を縦に追い、characterization → failure injection → root fix → regressionの順で処理する。
- 未tested 11画面と、大きなClient Component/編集画面を優先しつつ、既存test済み画面も独立探索する。
- AuthContext、NotificationContext、proxy、API client、autosave、load more、search debounce、ChapterReader、翻訳/記事/plan編集の非同期順序を逆転させる。
- 低速中navigation、二重click、reload、pagehide、BFCache、multi-tab、同時401/refresh、old response overwriteを試す。
- AbortSignal/request generation、single-flight、explicit reducer/state machine、rollbackを用いた根本修正を行う。
- 200/204/4xx/5xx/timeout/切断/非JSONでloading/empty/error/retryが正しく区別されることを確認する。
- IME、Unicode、long text、巨大pagination、invalid query/hash、back/forwardを試す。
- property-based testをURL、pagination、書章節変換、citation、入力normalizeへ適用する。
- 既存テストを読まない担当が90分単位の探索charterを全機能で実施し、動画/traceを保存する。

完了条件:

- 全画面・全主要操作がmatrix上で複数のtest手法により証明される。
- page/console/hydration/unhandled rejection/意図しないrequest error 0。
- 未処理Fetch AbortError 0。
- critical E2Eをrelease候補で50回反復し、初回失敗0。
- 意図しない視覚、文言、操作step、scroll/focus差分0。

### [ ] Step 8 — クロスブラウザ、レスポンシブ、WCAG、i18n、視覚回帰、SEO/PWA

実施内容:

- Chromium/Firefox/WebKitと6.5のviewport/zoom/orientation条件で主要/境界導線を実行する。
- overflow、sticky/fixed重なり、scroll lock、soft keyboard、safe area、back/forward復元を確認する。
- axeを全画面の主要状態で実行するが、自動結果だけで完了にしない。
- keyboardのみで全操作し、skip link、landmark、heading、focus order/trap/restore、Escape、live region、name/role/valueを確認する。
- 320px reflow、200%/400% zoom、contrast、target size、forced colors、reduced motionを確認する。
- NVDA+Firefox、VoiceOver+Safari相当の手動確認を行う。
- JA/EN全画面crawlで辞書未経由、混在、overflow、`html lang`、SSR/hydration差を検出する。
- title、description、canonical、OG、sitemap、robots、noindex、404 status、manifest、iconを公開状態別に検証する。
- 認証/編集/private/draft URLをindexさせず、公開動的画面は初期HTMLに必要内容を持つか確認する。
- visual baseline差分は規格対応の最小変更だけを個別承認対象にする。

完了条件:

- 適用されるWCAG 2.2 AA項目の未確認/未達0。
- axe serious/critical 0、keyboard到達不能/focus消失0。
- 3 browserで主要導線成功、意図しないpixel差分0。
- JA/EN固定文言、混在、overflow、言語不一致0。
- sitemap/robots/canonical/status/noindex不整合0。

### [ ] Step 9 — 性能、容量、耐障害性、観測性

実施内容:

- production相当件数の匿名化/生成datasetとtraffic profileを作る。
- 主要listでquery countをデータ件数非依存にし、N+1を防ぐ。
- PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`、`pg_stat_statements`で検索/一覧/index/connectionを確認する。
- Lighthouseをtop、read、search、article、translation公開画面でSlow 4G/CPU slowdown条件にて実行する。
- bundle、waterfall、重複fetch、不要render、長時間polling、画面往復によるmemory leakを測る。
- k6/Locust等でsteady、peak、spike、soakを実施し、read/search/write/auth/notification/translation競合を混ぜる。
- DB/Redis/SMTP/OAuthのlatency、拒否、切断、process restart、deploy中requestを注入する。
- 二重送信、retry storm、partial side effect、process kill後の不整合を確認する。
- frontend/backend Sentryへ同じrelease ID/request/trace IDを付ける。
- method/path/status/duration/release、DB、Redis、outbox、mail/OAuth、backup age、migration/content versionのmetrics/alertを整備する。query/secret/PIIは記録しない。
- live/readiness/startup healthを分離し、synthetic userでread/login/write/logoutを監視する。

暫定SLO/性能gate（実運用条件の確認後に厳しい側へ調整）:

- availability 99.9%/月。
- API error率0.5%未満。
- public read p95 500ms以下、search p95 800ms以下、write p95 1秒以下。
- Core Web Vitals good基準達成。
- Lighthouse Performance 90以上、Accessibility/SEO 100。
- 予測peakの2倍以上のcapacity headroom。
- 初期JS/request数/主要操作時間の無承認5%以上悪化なし。

完了条件:

- 合意したp95/p99/error rate/同時利用者/DB connection上限を満たす。
- N+1、pool枯渇、deadlock、memory leak、retry storm、データ不整合0。
- 依存障害解除後に自動回復し、alertからrunbookまで実動確認できる。
- 性能改善による見た目/操作性の悪化0。

### [ ] Step 10 — 本文正本、import、migration、deploy、backup/restore

実施内容:

- root/backendにある重複本文を単一正本へ統合する。移動はhash/件数/参照元を検証して段階的に行う。
- editionごとにsource URL、取得日、版、license根拠、source/normalized SHA-256、期待書章節/文字数、意図的gap/第0章等をcontent manifestへ記録する。
- DB不要の`validate-content`と、`--check/--dry-run/--apply`を持つ統一import/reconcile経路を作る。
- 未登録、0件、欠落、重複、予期しないskip、checksum不一致を非zero終了にする。
- 再実行の冪等性を「duplicateがない」ではなく「desired stateとの差分0」と定義する。
- 全337 edition相当のfull contentをshadow/stagingへloadし、完全検証後に原子的に公開する。
- `seed_demo`をnon-production専用にし、production guard、dry-run、明示phrase、run ID、transaction/cleanupを実装する。
- dev/staging/prodとRender/Vercel/PostgreSQL/OAuth/SMTP/Sentry/monitor設定をコード/Runbookへ落とす。
- production imageをnon-root、healthcheck、固定base image、graceful shutdown付きにする。
- migration/collectstatic/content reconcileをWeb起動から外し、単一pre-deploy jobにする。
- fresh DBに加えて匿名化したN-1 production相当DBからupgradeする。
- expand → backfill → verify → contractを分releaseにし、大規模indexのlock/timeoutを検証する。
- irreversible migrationはbackup ID、復元手順、承認を必須にする。
- pg_dump/PITRから別DBへrestoreし、migration、strict integrity、主要read/writeを実行する。
- app rollback、forward fix、誤削除、region障害、credential漏洩、データ破損のRunbookを訓練する。

暫定DR gate:

- RPO 15分以内、RTO 60分以内。実契約/構成で不可能ならrelease前に構成を変更する。
- 最新backupとPITRの双方から2回連続restore成功。

完了条件:

- 空PostgreSQLから期待する全content inventory/hashが一致する。
- 再import差分0、中断/再開時の部分公開0、未説明gap/skip/blank/duplicate 0。
- N-1→HEAD migration、restore、rollback rehearsal、strict integrity、主要操作が成功する。
- consoleだけに存在する必須設定/手順0。
- 同一commitから再現可能なartifact/release manifestがある。

### [ ] Step 11 — 外部連携、供給網、法務、プライバシー

実施内容:

- notification/reset/feedbackをtransactional outbox + workerへ統一し、idempotency、backoff、retry上限、DLQ、delivery statusを持たせる。
- Mailpitでintegration、provider sandboxでSPF/DKIM/DMARC、bounce、spam、reset linkを検証する。
- OAuth test appで実callbackと障害系を検証する。
- 推移依存までlock/hash固定し、front/back/container/contentのSBOM/BOMを生成する。
- pip/npm/OSV/SAST/secret/container/IaC/action scanを実行する。
- XML importerはdefusedxmlまたは明示したtrust boundary/size制限/testで恒久対応する。
- 全edition、画像、font、依存、source code、user generated translationの権利表を作る。
- 一次資料によるlicense evidenceがない本文/assetは公開対象から外す。
- `/licenses`の断言、実装、証拠、repo LICENSE、creditを一致させる。
- privacy policyへprocessor、backup retention、account削除後保持、monitoring/mail/OAuthの実態を反映する。
- ログ/Sentry/response/artifactにpassword、token、cookie、OAuth secret、不要なPII/本文がないことを自動検査する。

完了条件:

- Critical/High既知脆弱性0、secret検出0、SAST/DAST High 0。Mediumは全件根拠付きtriage済み。
- 署名/保存されたSBOM/Content BOMがある。
- mail/OAuth停止時にデータ喪失、500連発、retry storm、重複処理0。
- provenance/license不明0、表示と実態の不一致0、必要credit 100%、法務確認記録あり。
- secret/不要PII漏洩0。

### [ ] Step 12 — 独立レッドチーム、最新main統合、最終Go/No-Go

実施内容:

- 既存テスト/修正内容を読んでいない担当が、利用者/攻撃者/運用者として全機能を再探索する。
- frontend、backend/security、data/concurrency、operations/legalを別担当が相互レビューする。
- mutation survivor、未到達branch、例外catch、巨大component/effect/view、重複policy、manual operationを再監査する。
- OWASP ASVS 5.0 L2、API Top 10、WCAG 2.2 AAの全適用項目を証跡付きで再確認する。
- latest committed `main`を監査branchへ通常mergeし、競合解消後に全suiteをやり直す。
- production settings、PostgreSQL、full content、3 browser、本番build/imageでrelease candidateを作る。
- critical E2E 50回、full suite random/repeat、peak/soak、failure injection、restore/rollbackを再実行する。
- stagingでcanary、synthetic monitoring、alert、Runbook、release/rollback decisionをrehearsalする。
- 全Findings、残余リスク、test evidence、release manifestを独立レビューする。

最終Go条件:

- 機能/状態/証跡マトリクス充足率100%。
- P0/P1/P2未解決0。承認されていないP3/暫定対応0。
- lint、typecheck、SQLite補助、PostgreSQL全suite、contract、property、state-machine、mutation、E2E、build、container、security scanが全成功。
- 有効機能のskip/xfail/quarantine/retry救済/flake 0。
- coverage/mutation gate達成。
- OpenAPI error/warning 0、schema逸脱/未定義5xx 0。
- ASVS L2/API Top 10/WCAG AAの未確認/未達0。
- Critical/High vulnerability 0、secret/PII leak 0。
- PostgreSQL競合、不変条件、N+1、SLO、capacity、chaos gate合格。
- full content manifest/integrity/license/credit合格。
- migration/backup/restore/PITR/rollback/DR合格。
- frontend/backend monitoring、synthetic、alert、Runbook合格。
- 意図しないデザイン/UI/UX/文言/世界観の差分0。規格対応の最小差分は証拠と承認済み。
- 最新main統合後のrelease candidateに対して上記を再確認済み。

一つでも満たさなければNo-Goとする。

## 10. 各Step共通の完了手順

プロジェクトルールに従い、各Stepのトップレベルcheckboxを完了へ変える前に必ず次を順番に行う。

1. `main`/`origin/main`の進行と監査branchの差分を確認する。
2. Finding/ADR/matrix/test evidenceを更新する。
3. 変更箇所に対応するtargeted testを実行する。
4. backendで全`pytest`を実行し、passを確認する。
5. frontendで全`npm test`を実行し、passを確認する。
6. Stepに該当するlint、typecheck、build、OpenAPI、PostgreSQL、E2E、security、visual、performance等の追加gateを実行する。
7. warning、skip、flake、retry救済、未追跡artifactがないことを確認する。
8. 意図しない視覚/UI/UX差分がないことを確認する。
9. 小さく説明可能なcommitを作成する。
10. `codex/all-features-bug-audit`を`git push`する。

テストが落ちたまま、または証跡が不足したままcheckboxを完了にせず、pushしない。

## 11. マルチエージェント運用

必要に応じ、次の独立担当を並行させる。

- Frontend behavior/browser/accessibility担当。
- Auth/security/privacy担当。
- Backend contract/domain担当。
- PostgreSQL/data/concurrency/migration担当。
- Performance/reliability/observability担当。
- Operations/supply-chain/legal担当。
- 既存テストを読まないexploratory/red-team担当。

統合担当はmatrix、ADR、デザインbaseline、共通policy、release gateを一元管理する。同じファイルへの同時編集を避け、調査とtest設計は並列化しても、共有設計の変更は統合担当が順序付ける。重要修正は別担当が再現、test妥当性、根本原因、視覚/操作回帰をレビューする。

## 12. 初期優先順位

Step 0〜2で基盤と全体像を固定した後、次を最優先で検証する。

1. npm High 9件とNext.js直接依存の脆弱性。
2. OpenAPI 58 unique errors / 103 unique warnings。
3. 実CSRF、Cookie JWT例外処理、refresh競合、即時失効。
4. OAuth verified emailと既存account自動link。
5. email正規化/一意性/password validation/password reset列挙。
6. 認可/公開範囲、draft/unlisted/private/deletedの横断漏洩。
7. ReadingProgress、Translation、Plan、Notification、Citation等のDB不変条件。
8. PostgreSQL競合、lost update、二重作成、partial副作用。
9. frontendの未処理AbortError、old response上書き、multi-tab refresh、autosave/polling競合。
10. 全content importの0件/skip/drift/部分投入と単一正本化。
11. migration、backup restore、rollback、production readiness。
12. license/credit/privacy表示と実態の不一致。

この順序は調査結果に応じて変更できるが、優先度変更の理由をFindings台帳へ残す。
