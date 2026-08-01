# Claude 引き継ぎメモ（2026-08-02）

この作業は、全画面のデザイン・アクセシビリティ改善、`/read`・`/qa`・`/translations` の検索、Q&A一覧からの回答、権限・エラー処理の強化をまとめて本番反映する作業です。ユーザーから「本番反映まで」と明示されています。途中で止めず、PRのCI、mainへのマージ、本番デプロイ、本番スモークテストまで完了してください。

## 作業場所

- 元worktree（変更禁止）: `C:\Users\ymats\NeON-Church`
- 専用worktree: `C:\Users\ymats\NeON-Church-worktrees\list-searches-qa-answer`
- ブランチ: `codex/list-searches-qa-answer`
- PR: https://github.com/yuki-matsuno-525/NeON-Church/pull/59
- 本番: https://neon-church.com
- 進捗台帳: `plan/design-improvements-progress.md`

## ここまでの状態

- 主要実装コミット `7a876bb`、最初のmain統合 `bfa9d5e`、検証記録 `0d54cb0` はpush済み。
- PR作成直後にmainへPR #57（読書プラン/栞まとめ）が入ったため、最新 `origin/main` (`a81b732`) を再マージ中。
- 再マージの競合は `frontend/src/lib/apiClient.ts` のみで、双方のAPIを保持して解消・stage済み。APIテスト23件成功。
- 新規読書プランAPIを本番前監査し、空の公開/限定公開プラン、停止済み購読の完了操作、inactive読者を含む集計の3点を修正。`backend/tests/test_plans.py` は28件成功。
- 新規読書プラン4画面と各部品は、通信失敗/再試行、認証待ち、日英表示、フォーム関連付け、キーボード操作、44px操作領域、状態通知、autosave型まで追加監査・修正済み。
- 再マージ前の全検証は backend 601 passed / 13 skipped、frontend 353 passed、Playwright 43 passed、TypeScript、ESLint、production build、Django check/migration checkが成功済み。
- 再マージ後の最終検証も完了済み。backend 629 passed / 13 skipped（642 collected）、frontend 68 files / 376 passed、Playwright 48 passed、TypeScript、zero-warning ESLint、32-route production build、Django check/migration checkがすべて成功。
- E2Eで発見したReact Strict Mode時のautosave成功表示欠落も回帰テスト付きで修正済み。
- 最新main再統合コミット `1d406d9` はブランチへpush済み。次はPR #59のCI確認から開始する。

## 残作業（順番を守る）

1. 未解決競合・競合マーカー・未stage差分を確認する。
2. 全検証は完走済み。コード変更が増えた場合だけ影響範囲を再検証する。
   - backend: `pytest`
   - backend: `python manage.py check --settings=config.settings.test`
   - backend: `python manage.py makemigrations --check --dry-run --settings=config.settings.test`
   - frontend: `npm test`
   - frontend: `npx tsc --noEmit`
   - frontend: `npm run lint`
   - frontend: `npm run build`
   - E2E: 既存のPlaywright全件（Django/NextはIPv4 `127.0.0.1` を使用）
3. `plan/design-improvements-progress.md` とこのメモへ最終件数を記録する。
4. 全変更をstageし、`git diff --cached --check` 後に再マージをcommit、ブランチをpushする（AGENTS.mdによりテスト後のpush必須）。
5. PR #59 の Backend CI / Frontend CI / E2E / Vercel がすべて成功するまで監視する。
6. PR #59をmainへマージする。ブランチ/worktreeは削除しない。
7. mainのGitHub ActionsとVercel production deploymentが成功するまで監視する。
8. アプリ内ブラウザで本番の `/`、`/read`、`/qa`、`/translations`、`/plans`、`/articles` を匿名スモーク確認する。書検索・質問検索・プロジェクト検索を確認し、本番データを変更する操作はしない。
9. 最終報告にはPR URL、本番URL、main SHA、テスト件数、CI/デプロイ結果、進捗台帳へのリンクを含める。

## 注意

- 元worktreeやユーザー変更を上書きしない。`git reset --hard` / `git checkout --` は使わない。
- 競合解消では、本ブランチのUX/権限/APIエラー処理とmainの読書プラン機能を両方保持する。
- 本番のログイン済み画面を確認する場合も、作成・回答・削除・公開変更など本番データを変える操作はしない。
- ブラウザ操作終了時はviewportをresetし、不要タブをfinalizeする。
