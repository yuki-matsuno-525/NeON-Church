# リリース品質監査台帳

最終更新: 2026-09-06

| 項目 | 現在値 |
|---|---|
| worktree | `C:\Users\ymats\NeON-Church-all-features-bug-audit` |
| branch | `codex/all-features-bug-audit` |
| 記録時 HEAD | `66777b0` |
| 実行中 Step | Step 0: 再現可能なベースライン |
| 視覚 CI | run `33999696268`（視覚baselineを1 workerで再現性確認中） |
| 固定時刻 | `2026-08-02T12:00:00+09:00` |
| 固定 seed | `42` |
| main 保護 | 元 worktree のユーザー変更には未接触 |

## Step 0 の確定済み事項

- Python、Node、Playwright/Chromium を digest とバージョンで固定した隔離 runner を構築済み。
- Django、seed、ブラウザで同一の基準時刻を使用する。
- hydration の相対時刻差異を、SSR snapshot と共有 clock で根本修正済み。
- ブラウザの console、page error、unhandled rejection、通信失敗、HTTP 4xx/5xx を共通 fixture で検知する。
- 主要 7 journey を retry なしで各 10 回実行するゲートを視覚 CI に追加済み。
- 候補画像と操作動画の件数をmanifestから導出し、ファイル名・hashを検証する。
- 全routeのdesktopに加え、mobile・英語・認証route・主要6画面のfull-pageを含む50枚へ拡張済み。
- seedの同一性を、コメント20件から記事・プラン・Q&A・翻訳を含む主要表示データ全体へ拡張済み。
- run `33974352447` で同一SHA・seedの50画面を二重生成し、snapshot hash差分0を確認済み。主要7導線も各10回retryなしで成功した。
- 50枚の候補はhash・破損・寸法・空画像を機械確認し、代表画面と最長full-pageを目視確認してgoldenへ採用済み。
- unit testの未宣言HTTP通信を必ず失敗させる共通ガードを追加。4ファイル・27テストのmock漏れを修正し、全79ファイル・469テストを診断シグナル0で確認済み。
- backend全テストは701件成功・13件skip。skip理由は後続の該当Stepで個別評価する。
- Fontsource固定版はrun `33975070846`で46/50画面にpixel差分が出たため棄却。旧`next/font`と同一のOFL-1.1配布物124ファイルをhash manifest付きで固定し、Google Fontsへのbuild-time依存を除去した。lint・型検査・production buildはwarning 0で成功済み。
- run `33999405740`ではfont固定後の49/50画面がgoldenと一致したが、4 worker共有状態下で通知画面が背景だけになるcompositor/状態競合を再現。候補再描画自体は51/51一致したため、通常E2Eの並列性を保ったまま視覚baselineだけを1 workerへ直列化した。

## Step 0 の未完了ゲート

- run `33959059962` で匿名認証確認の正常な401、run `33959814584` で意図的404、run `33972582629` でautosave中の`networkidle` timeout、run `33972929404` と `33973638127` でclient-cancelled GETと章一覧遷移のflakeを順に検出し、狭い分類・利用者に見えるready条件・導線の契約へ修正済み。
- run `33999696268`で自己ホストfontとgoldenのpixel完全一致、および全反復ゲートの成功を確認する。
- 並行作業で進んだ`origin/main`の最新統合点`2f9faa5`を取り込み、ユーザーによる意図的UI変更を新baselineとして別途確認する。
- 最新HEADでbackend全pytestとfrontend全npm testを最終再確認し、Step 0証跡をcloseしてpushする。

## 後続 Step に明示して持ち越す事項

- Python の推移的依存関係と hash lock（供給網監査で扱い、リリース前に閉じる）。
- `npm install` が報告した既知 vulnerability 11 件（依存監査で個別評価し、未評価のまま許容しない）。
