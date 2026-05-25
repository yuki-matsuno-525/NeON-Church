# UI/UX リリースプラン（決定版）

NeON Church を「機能は揃ったが磨きが足りないアプリ」から「安心して人に勧められるサービス」に引き上げるための、実装→リリースまでを通しで進める唯一のマスタープラン。

これ以外の UI/UX 関連マークダウンは「将来検討の素材集」として保留する。実装着手はこのファイルに沿って行う。

## 関連ドキュメント（参考のみ。実装はこのファイルを優先）

- `plan/qa_ui_ux_improvement_plan.md`
- `plan/reading_ui_ux_improvement_plan.md`
- `plan/translation_ui_ux_improvement_plan.md`
- `plan/other_features_ui_ux_improvement_plan.md`
- `plan/product_growth_improvement_ideas.md`
- 横断調査メモ: `C:\Users\ymats\.claude\plans\ui-ux-serialized-pelican.md`

## 採用基準（なぜこの 14 項目に絞ったか）

各候補を次の 4 観点で評価し、上位を採用した。

1. **信頼性・安全性に直結する**（プライバシー、規約、a11y）
2. **小さく出荷可能**（1 セッションで完結、ロールバック容易）
3. **ユーザーが目に見えて分かる改善**（裏側のリファクタ単独はスコープ外）
4. **既存実装の致命的欠陥を直す**（既存プランの中長期構想ではなく、いま壊れている所）

スコープ外（中長期は既存プランで継続）:
- `/qa/[id]` 詳細ページ、`/qa/ask` 分離、Question Title 化
- `/read` 文献ライブラリ化、外典・偽典分類
- 翻訳 Workspace 画面、2 カラム編集、Parallel mode
- 読書計画 / streak / 通知設定

## リリース戦略

3 リリースに分割。1 リリースの目安は 4〜6 ステップ。各ステップ完了で即 `git push` し、リリース末尾で本番デプロイ + リリースノート公開。

| リリース | 目標 | 含まれるステップ |
|----------|------|------------------|
| Release 1: 信頼性と基盤 | 「人に勧められる」最低ラインを整える。フォーム a11y、信頼性ページ、共通 UI 部品の整備 | UX-1 〜 UX-5 |
| Release 2: 読書・通知・プライバシー | 中核体験（読む / 通知が届く / 自分のデータが守られる）を仕上げる | UX-6 〜 UX-9 |
| Release 3: 探索性とデザイン整理 | Q&A 共有、章ナビ、デザイントークン化、モバイルと検索体験 | UX-10 〜 UX-14 |

各リリースの完了時にやること（共通）:

- backend に変更があれば `pytest` を実行
- frontend は `npm test` を実行
- `npm run dev` でデスクトップ + モバイル幅で目視確認
- キーボードのみで主要動線を完走
- 信頼性に関わる変更を含む場合、Lighthouse Accessibility スコアが下がっていない
- `git push`
- リリースノートを GitHub Releases に書く（タイトル、含まれる Step、確認方法）
- 本番デプロイ

実装時の前提:

- フロントエンドは特殊版の Next.js を採用（`frontend/AGENTS.md` 参照）。ルーティング / Server Component / Metadata に触れる前に `node_modules/next/dist/docs/` のガイドを確認する。
- 既存実装の見た目を変える際は、まず screenshot を撮ってから始める。

---

# Release 1: 信頼性と基盤

「初対面のユーザーがログイン画面と Footer を見て、安心して登録できる」状態にする。

## Step UX-1: フォームアクセシビリティ統一

- 対象:
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/register/page.tsx`
  - `frontend/src/app/profile/page.tsx`（bio textarea、avatar input）
  - `frontend/src/components/qa/QAPostForm.tsx`
  - `frontend/src/app/translations/new/page.tsx`
  - `frontend/src/app/search/page.tsx`
  - `frontend/src/app/globals.css`
- 修正内容:
  - 全 input / textarea / select に `id` を付与し、対応する `<label htmlFor>` で結ぶ
  - `autocomplete` 属性: `username` / `email` / `current-password` / `new-password` / `off` を適切に
  - エラー表示要素に `role="alert"` と `aria-live="polite"`
  - `globals.css` に `:focus-visible` 共通ルール（`outline: 2px solid var(--accent); outline-offset: 2px;`）を追加し、各フォームの inline `outline: none` を撤去
  - 検索入力を `type="search"` にし、入力中に × クリアボタンを表示
- 受け入れ条件:
  - 主要フォームを Tab キーだけで完走でき、フォーカス位置が常に視認可能
  - スクリーンリーダーで label とエラーが読み上げられる
  - DevTools Accessibility tree で警告ゼロ

## Step UX-2: 認証導線の磨き込み

- 対象: `login/page.tsx`, `register/page.tsx`, `contexts/AuthContext.tsx`, `lib/i18n.ts`
- 修正内容:
  - パスワード入力欄横に表示切替ボタン（eye / eye-off アイコン、`aria-pressed`）
  - 8 文字未満で submit 時のエラー文言を i18n key 化（`passwordTooShort`）
  - ログイン済み状態で `/login` `/register` にアクセスした場合は `from` または `/` へ自動 redirect
  - submit エラー文言が `error.detail` ベタ表示にならないようマッピング
- 受け入れ条件:
  - 既ログインユーザーは login ページに留まれない
  - 短いパスワードを試した時に「8 文字以上で入力してください」が必ず出る
  - パスワード入力中にトグルで内容を確認できる

## Step UX-3: 共通 UI コンポーネント整備（第 1 弾）

横断的に何度も書かれている UI を共通化する基盤を作る。後続ステップで段階適用。

- 対象（新規ファイル）:
  - `frontend/src/components/ui/Skeleton.tsx`
  - `frontend/src/components/ui/Spinner.tsx`
  - `frontend/src/components/ui/EmptyState.tsx`（icon / title / description / action props）
  - `frontend/src/components/ui/Toast.tsx` + `ToastProvider`
  - `frontend/src/components/ui/ConfirmDialog.tsx`
  - `frontend/src/components/ui/Button.tsx`（variant: primary / secondary / ghost / destructive）
  - `frontend/src/components/ui/TextField.tsx`（label / hint / error / autocomplete を props 化）
- 修正内容:
  - 既存実装は触らずコンポーネントのみ追加。Step UX-4 以降で段階的に置換
  - `ClientLayout.tsx` に `ToastProvider` を挿入
  - 単体テスト（React Testing Library）を各コンポーネント最低 1 件
- 受け入れ条件:
  - 既存画面の見た目に差分が出ない（純粋追加）
  - `npm test` がパス
  - 各コンポーネントが `demo` ページから手動確認できる

## Step UX-4: 共通コンポーネントの段階的適用

Step UX-3 で作った部品を実画面へ適用し、ローディング / 空状態 / 確認操作の品質を底上げ。

- 対象:
  - `app/profile/page.tsx`, `notifications/page.tsx`, `qa/page.tsx`, `translations/page.tsx`, `bookmarks/page.tsx`, `translations/[id]/page.tsx`
- 修正内容:
  - 「読み込み中...」を `Skeleton` に置換
  - 各空状態を `EmptyState`（CTA 付き）に統一。例: ブックマーク 0 件 → 「読書を始める」ボタン
  - `translations/[id]/page.tsx` の `confirm()` / `alert()` を `ConfirmDialog` と `Toast` に置換
- 受け入れ条件:
  - 主要 6 画面で empty / loading / 確認ダイアログのトーンが揃う
  - 文言はすべて i18n 経由
  - confirm 系操作で誤タップ → キャンセル動線が存在

## Step UX-5: Footer と信頼性ページ群

- 対象:
  - 新規 `frontend/src/components/layout/Footer.tsx`
  - 新規 `frontend/src/app/terms/page.tsx`
  - 新規 `frontend/src/app/privacy/page.tsx`
  - 新規 `frontend/src/app/guidelines/page.tsx`（コミュニティガイドライン）
  - 新規 `frontend/src/app/licenses/page.tsx`（聖書本文・翻訳のライセンス表記）
  - 新規 `frontend/src/app/feedback/page.tsx`（GitHub Issues 等への導線）
  - 既存 `frontend/src/app/ClientLayout.tsx`, `about/AboutContent.tsx`
- 修正内容:
  - Footer に Terms / Privacy / Guidelines / Licenses / Feedback / GitHub リンクを配置
  - About ページ末尾にも同リンク群
  - 各信頼性ページの雛形を作成（h1、概要、最小コンテンツ。Guidelines と Licenses は本文を初版として書く）
  - 雛形ページは `<title>` / meta description / OGP を設定
- 受け入れ条件:
  - 全ページのフッタから 5 リンクすべてに到達可能
  - 信頼性ページが 200 を返す
  - Guidelines に「敬意ある対話 / 宗派差への配慮 / 断定的攻撃の禁止 / 個人情報の扱い」が記載されている
  - Licenses に使用中の聖書本文と翻訳プロジェクトの取り扱い方針が記載されている

## Release 1 リリースノート見出し例

```
v0.x.0 — 信頼性と基盤
- フォームアクセシビリティ統一
- 認証導線改善（パスワード表示切替、リダイレクト）
- 共通 UI 部品の整備（Skeleton / EmptyState / Toast / ConfirmDialog）
- Footer 追加、利用規約 / プライバシー / ガイドライン / ライセンス / フィードバック ページ公開
```

---

# Release 2: 読書・通知・プライバシー

「読む / 戻ってくる / 自分のデータが守られる」中核体験を仕上げる。

## Step UX-6: 通知のクリック先と文脈表示

- 対象:
  - `backend/notifications/serializers.py`, `models.py`, `views.py`
  - `frontend/src/app/notifications/page.tsx`
  - `frontend/src/components/layout/Navbar.tsx`, `Sidebar.tsx`
  - 新規 `frontend/src/contexts/NotificationContext.tsx`（未読数の単一情報源）
- 修正内容:
  - 通知シリアライザに `target_url`（例: `/matthew/3#verse-12` または `/qa/42`）と `context_label`（「マタイ 3:12 への返信」）を追加
  - 通知カードを `<Link>` 化し、クリックで遷移 & 既読化
  - 未読数取得を `NotificationContext` に集約し、Navbar / Sidebar / `/notifications` ページで共有
  - 「すべて既読」ボタンを常時表示し、件数 0 で `disabled`（layout shift 防止）
- 受け入れ条件:
  - 通知クリックで該当コメント / 質問 / 翻訳ユニットへスクロール込みで到達
  - 未読バッジが 3 箇所で常に一致
  - pytest で `target_url` 生成のロジックがカバーされる

## Step UX-7: 公開プロフィールのプライバシー再設計

- 対象:
  - `backend/users/models.py`, `serializers.py`, `views.py`, migration
  - `frontend/src/app/profile/page.tsx`, `profile/[username]/page.tsx`
- 修正内容:
  - `UserProfile` に `bookmarks_visibility`（`private` / `public`、default `private`）を追加 → migration
  - 公開プロフィール API は `bookmarks_visibility=public` の時のみブックマークを返す
  - 自分のプロフィール画面に「お気に入りを他のユーザーに公開する」トグル
  - 他人視点ではブックマークタブごと非表示、または「非公開」表示
- 受け入れ条件:
  - 既存ユーザーは全員 default private で他人には見えない
  - 設定変更が即時反映
  - pytest で private / public 両方の API レスポンスをカバー

## Step UX-8: 節操作とモバイル本文表示の改善

- 対象:
  - `frontend/src/components/reader/VerseList.tsx`
  - `frontend/src/app/[book]/[chapter]/page.tsx`
  - `frontend/src/app/globals.css`
- 修正内容:
  - 節 div の `padding` を `12px 16px` に拡大、`min-height: 44px` 確保
  - 節選択時の「コメント」ボタンを CommentPanel の投稿欄へフォーカス移動するハンドラに差し替え（または当該ボタンを削除して bookmark に絞る）
  - `globals.css` のモバイル `.reader-wrapper.has-verse .reader-main { display: none !important }` を撤去し、bottom sheet スタイル（本文は背景に残し、パネルが画面の 70% を占める）に変更
  - `verse-flash` を 2.5s に短縮、`@media (prefers-reduced-motion: reduce)` で無効化
- 受け入れ条件:
  - モバイルで節タップが誤爆しにくい
  - パネル展開中も本文の前後が部分的に視認できる
  - reduced-motion 設定で点滅しない

## Step UX-9: CommentPanel の読書圧軽減

- 対象: `frontend/src/components/reader/CommentPanel.tsx`
- 修正内容:
  - 投稿フォームをデフォルト折りたたみ、「コメントを書く」ボタンで展開
  - リサイズハンドルに `onTouchStart` / `onTouchMove` を追加
  - パネルヘッダの「閉じる」ボタンをアイコン + `aria-label` で明示
- 受け入れ条件:
  - 読むだけの操作で投稿欄が視野に入らない
  - モバイル/タブレットでパネル幅をドラッグで変更できる
  - SR で「コメントパネルを閉じる」と読み上げられる

## Release 2 リリースノート見出し例

```
v0.x.0 — 読書・通知・プライバシー
- 通知をクリックで対象へジャンプ可能に。未読バッジを一元化
- お気に入りはデフォルト非公開に変更（公開はオプトイン）
- 節タップ領域拡大、モバイルでも本文が背景に残るように
- コメントパネルの投稿欄をデフォルト折りたたみ
```

---

# Release 3: 探索性とデザイン整理

「探しやすく、見た目が整っている」状態にする。デザインシステム第 1 弾。

## Step UX-10: Q&A フィルタ状態を URL に反映

- 対象: `frontend/src/app/qa/page.tsx`
- 修正内容:
  - `selectedBookId`, `selectedTagId`, `answeredFilter`, `page` を URL query (`?book=&tag=&answered=&page=`) と双方向同期
  - 初期マウント時に query から state 復元
  - フィルタ変更時に `router.replace` で URL 更新（履歴汚染なし）
- 受け入れ条件:
  - 任意フィルタ状態の URL を共有 / リロードで再現可能
  - ブラウザバックでフィルタ前の状態に戻れる

## Step UX-11: 章ナビゲーション / 翻訳切替の配置整理

- 対象: `frontend/src/app/[book]/[chapter]/page.tsx`
- 修正内容:
  - 左右 fixed の章ナビを「本文上部の sticky ツールバー + 下部の Prev/Next バー」に再配置（パネル開時の干渉ロジックを削除）
  - 翻訳 `<select>` を Toolbar 内のラベル付きトグル（現在の翻訳が常に視認できる形）に変更
  - 将来の Parallel mode への布石として、Toolbar に Reader モード切替の入口（プレースホルダ）を準備
- 受け入れ条件:
  - パネル開閉時に章ナビが本文を圧迫しない
  - 翻訳切替が一目で見つかる
  - デスクトップ / モバイル双方で破綻しない

## Step UX-12: デザインシステム第 1 弾（CSS トークン化と inline style 削減）

- 対象:
  - `frontend/src/app/globals.css`
  - `frontend/src/app/page.tsx`（ホーム聖句カード）
  - `VerseList.tsx`, `notifications/page.tsx`, `qa/page.tsx`, `translations/page.tsx`
- 修正内容:
  - `globals.css` に CSS 変数追加: `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--space-1..6`, `--shadow-card`, `--shadow-card-hover`
  - 共通クラス `.card`, `.card-hover`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.badge`, `.badge-status-*` を定義
  - ホームページの聖句カード boxShadow の繰り返しを `.verse-card-hover` 1 クラスに集約
  - 上記 5 ファイルの代表的 inline style をクラスへ置換（全置換ではなく頻度の高いものに絞る）
- 受け入れ条件:
  - 視覚的に大きな差分が出ない
  - border-radius が 3 段階に整理される
  - 次ステップ以降の置換が「クラス適用するだけ」で済むようになる

## Step UX-13: モバイルナビゲーションのタップ性向上

- 対象: `Navbar.tsx`, `Sidebar.tsx`, `MobileMenu.tsx`
- 修正内容:
  - ハンバーガーボタンに `min-width: 44px; min-height: 44px;` を保証
  - アクティブナビに `aria-current="page"` を付与
  - モバイル時のメニュー閉じるボタンに `aria-label`
- 受け入れ条件:
  - モバイルブラウザでハンバーガーが指で確実に押せる
  - SR でアクティブ位置を読み上げ可能

## Step UX-14: 検索体験の改善（UI のみ）

- 対象: `frontend/src/app/search/page.tsx`
- 修正内容:
  - 入力欄に × クリアボタン（焦点を残したまま入力をクリア）
  - 結果 0 件時に `EmptyState`（「他のキーワード」「Q&A を見る」「文献ライブラリへ」など CTA）
  - 結果カードの種別バッジ（節 / コメント / 書名）を明確化
  - `Type` フィルタの将来余地として、結果上部にタブ枠だけ用意（中身は次フェーズ）
- 受け入れ条件:
  - 0 件時に詰まらない
  - クリアボタンで素早く再検索できる

## Release 3 リリースノート見出し例

```
v0.x.0 — 探索性とデザイン整理
- Q&A のフィルタ状態を URL で共有可能に
- 章ページの章ナビと翻訳切替の配置を整理
- 共通カード・ボタン・バッジクラスを導入、inline style を整理
- モバイルナビのタップ性向上
- 検索結果の空状態とクリアボタン追加
```

---

# リリース全体のチェックリスト

各リリース前後で実施する。

## リリース前

- [ ] 全 Step が完了し PR / コミットがマージ済み
- [ ] backend テスト: `pytest`
- [ ] frontend テスト: `npm test`
- [ ] 主要画面の手動確認（未ログイン / ログイン済み / 翻訳プロジェクトオーナー の 3 視点）
- [ ] モバイル幅（375px）とデスクトップ幅（1280px）両方で目視
- [ ] キーボードのみで主要動線完走
- [ ] Lighthouse Accessibility がリリース前より下がっていない

## リリース時

- [ ] `git push` 済み
- [ ] 本番デプロイ
- [ ] GitHub Releases にリリースノート作成
- [ ] 影響範囲が大きい変更があれば `README.md` を更新

## リリース後

- [ ] 本番で 5 分以内に主要動線（ログイン / 読書 / コメント / 通知）が動くこと
- [ ] エラーログ確認
- [ ] フィードバックフォーム（Feedback ページ）経由の声を週次で確認

---

# 中長期事項（このリリースには含めない）

採用基準を満たさなかった項目。完了後に既存プランを参照して継続する。

- `/qa/[id]` 詳細ページ、`/qa/ask` 分離、Question Title 導入 → `qa_ui_ux_improvement_plan.md`
- `/read` を文献ライブラリへ再設計、外典・偽典分類 → `reading_ui_ux_improvement_plan.md`
- 翻訳 Workspace、2 カラム編集、Parallel mode → `translation_ui_ux_improvement_plan.md`
- 読書計画 / streak / 通知設定 → `reading_ui_ux_improvement_plan.md`, `other_features_ui_ux_improvement_plan.md`
- bottom navigation、Search タブ化、Search フィルタ拡張 → `other_features_ui_ux_improvement_plan.md`
- OAuth ログイン、メール認証、パスワードリセット → `other_features_ui_ux_improvement_plan.md`

---

# 進捗

| Release | Step | 状態 | コミット | 備考 |
|---------|------|------|----------|------|
| R1 | UX-1 フォーム a11y 統一 | DONE | | login/register/profile/QAPostForm/translations-new/search に label htmlFor / autocomplete / role=alert / focus-visible / 検索 × ボタン |
| R1 | UX-2 認証導線磨き込み | DONE | | パスワード表示切替 / 既ログイン時リダイレクト / passwordTooShort / apiClient エラー文言の人間可読化 |
| R1 | UX-3 共通 UI コンポーネント整備 | DONE | | Skeleton/Spinner/EmptyState/Button/TextField/Toast(+Provider)/ConfirmDialog 追加。ClientLayout に ToastProvider 挿入。/demo/ui で動作確認可能 |
| R1 | UX-4 共通コンポーネント適用 | DONE | | 6 画面の loading を SkeletonList、空状態を EmptyState (CTA 付き)、translations/[id] の confirm/alert を ConfirmDialog/Toast に置換 |
| R1 | UX-5 Footer + 信頼性ページ | DONE | | Footer 追加 (全ページ表示) + /terms /privacy /guidelines /licenses /feedback の 5 ページ追加 + About 末尾にも信頼性リンク群 |
| R2 | UX-6 通知のクリック先と文脈 | DONE | | backend に target 情報 + unread-count API、NotificationContext + URL/label helper、Navbar/Sidebar/通知ページを Context に統合、通知カードを Link 化、全既読ボタン常時表示 |
| R2 | UX-7 公開プロフィールのプライバシー | DONE | | User.bookmarks_visibility (default=private) 追加、公開プロフィールでタブ非表示、自分のプロフィールに公開トグル |
| R2 | UX-8 節操作とモバイル本文表示 | DONE | | 節タップ領域 44px 確保、verse-flash 2.5s に短縮、no-op コメントボタン削除、モバイルで本文を背景に残す bottom sheet 化 |
| R2 | UX-9 CommentPanel 読書圧軽減 | DONE | | 投稿フォームをデフォルト折りたたみ、リサイズハンドルにタッチ対応、閉じるボタンに aria-label と 32px タップ領域 |
| R3 | UX-10 Q&A フィルタ URL 反映 | DONE | | book / tag / answered / page を URL query と双方向同期。URL を単一情報源にし、ブラウザバックで前のフィルタ状態に戻れる |
| R3 | UX-11 章ナビ / 翻訳切替配置整理 | DONE | | 左右 fixed の章ナビを撤去し本文末尾の prev/next バーへ、翻訳 select にラベル「翻訳」明示、scroll-top の panel 干渉ロジック削除 |
| R3 | UX-12 DS 第 1 弾 | DONE | | CSS 変数 (radius/space/shadow) と共通クラス (.card/.btn-*/.badge-*) を globals.css に追加。inline style 置換は次フェーズで段階的に |
| R3 | UX-13 モバイルナビ タップ性向上 | DONE | | ハンバーガーボタン 44x44px 確保、Sidebar の各 nav リンクに min-height: 44px と aria-current=page を付与 |
| R3 | UX-14 検索体験改善 | TODO | | |
