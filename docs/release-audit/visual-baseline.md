# Step 0 視覚ベースライン運用

## 目的と守備範囲

現行のデザイン、UI/UX、文言、世界観を、内部設計や不具合を直す前に凍結する。基準画像は「望ましいデザインへの提案」ではなく、意図しない差分を検出するための特性化証拠である。

`frontend/e2e/visual-baseline.spec.ts` は、`src/app/**/page.tsx` の全35ページを日本語・デスクトップ・代表状態で1枚ずつ検査する。さらに、レイアウト系統を代表する4ページをモバイル、4ページを英語で検査し、App Routerに吸収されない3階層URLで404を検査する。すべてviewport内だけを撮り、同じ長文ページの巨大なfull-page画像は作らない。画面下部や操作後の重要状態は、Findingごとに対象要素へ絞った画像を追加する。

この検査は、WCAGの手動確認、キーボード操作、axe、3ブラウザ、レスポンシブ探索の代わりにはならない。ピクセルが同じでも操作性や意味が壊れることがあるため、Step 7〜8では別の証拠を重ねる。

## 正本環境

画像の正本は次の条件をすべて固定したLinux環境でのみ更新する。Windows/macOSのローカル画像はフォントラスタライズが異なるため、調査用であって正本としてcommitしない。

- release候補と同じproduction buildのNext.jsを使用する。
- Playwright公式image `mcr.microsoft.com/playwright:v1.59.1-noble`をdigestで固定し、lockfileの`@playwright/test`も1.59.1に一致させる。imageに含まれるChromiumとfontを使用する。
- PostgreSQL 16の専用DBを使用する。開発DB、共有DB、本番DBでは実行しない。
- viewportはdesktop `1440 x 1000`、mobile `390 x 844`、device scale factorは1。
- timezoneは`Asia/Tokyo`、localeは`ja-JP`、color schemeはdark、reduced motionを有効にする。
- ブラウザ時刻とseed基準時刻は`2026-08-02T12:00:00+09:00`で一致させる。
- animation、transition、caretを撮影時だけ停止し、`document.fonts.ready`、画像読み込み、二重`requestAnimationFrame`を待つ。
- リトライで画像差分を救済しない。同じrelease SHAで初回成功することを求める。

## 専用DBの再構築

`--wipe`は利用者データを削除する。接続先が視覚検査専用DBであることをDB名と接続先の両方で確認してから実行する。

test-only passwordは画面へ出ないため毎回同じ値である必要はない。secret managerまたは実行時生成した十分に長い値を環境変数へ渡し、リポジトリ、文書、ログには値を保存しない。

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE = "config.settings.e2e"
if (!$env:VISUAL_BASELINE_ADMIN_PASSWORD -or !$env:VISUAL_BASELINE_USER_PASSWORD) {
  throw "Set the two visual-baseline password environment variables first."
}
python manage.py migrate
python manage.py import_gospel --path ../text
python manage.py seed_demo --wipe --scale small --seed 42 --reference-time "2026-08-02T12:00:00+09:00" --admin-username visual_admin --admin-password $env:VISUAL_BASELINE_ADMIN_PASSWORD --user-password $env:VISUAL_BASELINE_USER_PASSWORD > $null
```

`seed_demo`は指定したpasswordを成功時の標準出力へ含めるため、上記のとおり標準出力を保存しない。標準エラーと終了codeは維持し、失敗はそのままgateを止める。この出力仕様自体の恒久修正は後続Findingで扱う。既存superuserがあるDBでは`seed_demo`はそのアカウントを再利用し、指定したadmin passwordへ変更しない。このため、正本生成には必ず空の専用DBを使う。一般ユーザーは固定seedで同じ表示名・本文・件数・作成時刻になり、全員が環境変数の共通テスト用passwordを持つ。

## 実行方法

通常の`npm run e2e`では、画像比較は有効化せず、ソース上のページ一覧とベースライン台帳が一致することだけを検査する。これにより、新しいページを画像台帳へ追加し忘れると通常CIでも失敗する。画像検査は固定seed専用DBと正本環境がそろった明示的なrelease gateでだけ有効にする。

```powershell
cd frontend
$env:PLAYWRIGHT_VISUAL_BASELINE = "1"
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3000"
$env:PLAYWRIGHT_API_BASE = "http://localhost:8000"
npx playwright test e2e/visual-baseline.spec.ts --project=chromium
```

初回または承認済み変更後に正本を更新するときだけ、同じコマンドへ`--update-snapshots`を加える。失敗画像を正本へ自動昇格しない。変更前後画像、変更理由、関連するFindingまたはWCAG 2.2達成基準をレビューし、承認された画像だけをcommitする。

`PLAYWRIGHT_VISUAL_BASELINE=1`の実行では各routeの動画を`test-results`へ保存する。動画はroute到達までのloading、hydration、最終表示を含む操作証跡であり、成功時も保存する。CIはPNG比較の成否にかかわらず`.webm`をartifact化する。長期保存する承認証跡はrelease SHAと紐付け、日常的な重複artifactはCIの保存期限で削除する。

`.github/workflows/visual-regression.yml`の通常経路はLinuxでcommit済みPNGと比較する。Playwrightは比較実行時にsnapshotを自動生成して合格にしないため、PNGが1枚でも欠ければ失敗する。初回branch pushまたは実差分で比較が落ちた場合は、別のoutput directoryで候補生成を続行してartifactへ載せ、artifact upload後に元の比較失敗をjobへ戻す。したがって候補を取得できてもrelease gateは失敗のままである。`workflow_dispatch`の`update_snapshots=true`も候補をartifactへ出すだけでリポジトリを更新せず、レビューなしの正本昇格を防ぐ。

## 動的URLと認証状態

モデルのUUIDはDjangoが生成するため、seedを固定しても同じ値にはならない。UUIDを画像名や固定URLに埋め込まず、固定seedで作られた公開記事、質問、プラン、公開翻訳をAPIから意味的に選び、その応答のIDでURLを組み立てる。画像名は`route-06-article-detail-ja-desktop.png`のようにroute IDだけから作るため、DB再構築後も同じ正本と比較できる。

所有者画面は、選択した記事・プラン・翻訳の`owner_username`を取得し、その固定seedユーザーとしてAPI loginしてから開く。`/profile`、`/settings`、`/notifications`、`/bookmarks`、新規作成画面も固定seedの一般ユーザーを使う。`Date.now()`を含むE2Eユーザー名や、新規作成直後の不安定な一覧は画像へ使わない。

`/[book]`が全1階層URL、`/[book]/[chapter]`が全2階層URLと競合するため、存在しない`/foo`や`/foo/bar`を404の基準には使わない。404は`/__visual_missing__/__visual_missing__/__visual_missing__`で検査する。書・章の正常系は、正典slugと章番号が安定している`/matthew`、`/matthew/1`を使う。

## 差分の判定

- 通常の内部修正は意図しない差分0を必須とする。
- 日付、UUID、ユーザー名を画面全体のmaskや閾値緩和で隠さない。揺れた場合はseed、時刻、選択規則、読み込み完了条件の原因を直す。
- anti-aliasingの差分を許す目的で`maxDiffPixelRatio`を増やさない。正本OS・browser revisionの不一致を先に疑う。
- WCAG 2.2 AA、法務、安全性のために外観変更が必要なら、達成基準、失敗証拠、代替案、変更前後画像、影響routeをFindingへ記録する。
- 視覚差分がなくても、操作手順、focus、scroll、読み上げ、レスポンス速度が悪化した変更は不合格とする。

## 維持ルール

1. `src/app/**/page.tsx`を増減した変更では、route inventory testが失敗する。対応する代表状態とroute IDを同じ変更で追加・削除する。
2. データ状態を増やす場合は全ページの画像を複製せず、リスクのある画面・要素へ限定する。
3. baseline更新commitには対象release SHA、実行OS/image、Chromium revision、seed command、差分レビュー結果を証跡として残す。
4. snapshot欠落、差分、初回失敗、画像読み込み失敗、font未完了をrelease gateの失敗として扱う。
5. goldenは生成物であって設計正本ではない。明らかな既存不具合を「画像と同じだから正しい」と判断しない。
