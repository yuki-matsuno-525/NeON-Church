# リリース品質監査台帳

最終更新: 2026-09-05

| 項目 | 現在値 |
|---|---|
| worktree | `C:\Users\ymats\NeON-Church-all-features-bug-audit` |
| branch | `codex/all-features-bug-audit` |
| 記録時 HEAD | `705db36` |
| 実行中 Step | Step 0: 再現可能なベースライン |
| 視覚 CI | run `33959059962`（候補生成失敗、原因修正済み・再実行待ち） |
| 固定時刻 | `2026-08-02T12:00:00+09:00` |
| 固定 seed | `42` |
| main 保護 | 元 worktree のユーザー変更には未接触 |

## Step 0 の確定済み事項

- Python、Node、Playwright/Chromium を digest とバージョンで固定した隔離 runner を構築済み。
- Django、seed、ブラウザで同一の基準時刻を使用する。
- hydration の相対時刻差異を、SSR snapshot と共有 clock で根本修正済み。
- ブラウザの console、page error、unhandled rejection、通信失敗、HTTP 4xx/5xx を共通 fixture で検知する。
- 主要 7 journey を retry なしで各 10 回実行するゲートを視覚 CI に追加済み。
- 候補画像 44 枚と操作動画 44 本の manifest・hash 検証を追加済み。

## Step 0 の未完了ゲート

- run `33959059962` で、匿名状態の正常な `/auth/me`・`/token/refresh` の 401 を guardrail が障害扱いすることを検出。2 endpoint・method・status の完全一致だけを既定許可し、隣接 endpoint の 401 は失敗する回帰テストを追加済み。CI再実行待ち。
- 成功した Linux 候補画像だけを取得し、人手で代表画面を確認する。
- golden を commit 後、比較 CI を緑にする。
- 同一 SHA・同一 seed の二重生成で PNG hash が一致することを証明する。
- anonymous/auth、ja/en、desktop/mobile、主要状態、below-fold の基準範囲を再点検する。
- seed 再現性テストを、コメント先頭 20 件以外の表示データへ拡張する。
- Google Fonts の build-time 外部依存を、デザイン差分を確認しつつ固定・自己ホスト化する。
- Step 0 証跡を記録し、backend 全 pytest と frontend 全 npm test を通して push する。

## 後続 Step に明示して持ち越す事項

- Python の推移的依存関係と hash lock（供給網監査で扱い、リリース前に閉じる）。
- `npm install` が報告した既知 vulnerability 11 件（依存監査で個別評価し、未評価のまま許容しない）。
