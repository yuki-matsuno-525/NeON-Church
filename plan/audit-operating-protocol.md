# 品質監査の省トークン運用

品質ゲートは `plan/backlog.md` を唯一の基準とし、この文書は調査範囲を縮小するためには使わない。省くのは検証ではなく、会話への重複出力と再調査である。

## 実行ログ

- 長いテスト、lint、build、静的解析は `.github/scripts/run-audit-check.ps1` 経由で実行する。
- 完全な標準出力・標準エラーは `artifacts/audit/logs/` に保存する。このディレクトリは Git 管理外である。
- 会話には JSON の成否、所要時間、診断シグナル数と、最大 30 行の診断候補だけを返す。
- ラッパーが拾った warning / skip / retry / timeout は、終了コードが 0 でも未確認のまま無視しない。必要な箇所だけ完全ログを読む。
- 失敗後の再実行は、原因を特定して修正した後に行う。根拠のない反復実行で flake を隠さない。

実行例:

```powershell
pwsh -File .github/scripts/run-audit-check.ps1 -Name backend-pytest -WorkingDirectory backend -Executable ../.venv/Scripts/python.exe -ArgumentsJson '["-m", "pytest", "-q"]'
pwsh -File .github/scripts/run-audit-check.ps1 -Name frontend-test -WorkingDirectory frontend -Executable fnm -ArgumentsJson '["exec", "--using", "22.23.1", "npm.cmd", "test", "--", "--run"]'
```

## 調査の進め方

1. 各 Step の開始時に、対象・合格条件・既知の未解決事項を `plan/audit-ledger.md` で確認する。
2. 既存テストだけでなく、静的解析、契約、統合、E2E、アクセシビリティ、視覚差分、性能、セキュリティ、障害注入、手動探索を、該当する Step で組み合わせる。
3. 同じ事実を再取得しない。commit SHA、CI run ID、固定 seed、証跡の場所を台帳に残す。
4. サブエージェントは、独立して並列化できる明確な監査面があり、重複調査を避けられる場合だけ使う。報告は「重大度・再現条件・根拠・修正案・未確認事項」に限定する。
5. 各 Step の完了時は `AGENTS.md` に従い、backend の全 pytest、frontend の全 npm test、push を行う。最終 Step では warning / skip / flake / retry の残存も 0 にする。

## 変更方針

- デザインは変更しない。WCAG 2.2 AA 等の明確な基準に必要な最小変更だけを許容し、視覚差分で世界観への影響を確認する。
- 症状への局所的な継ぎ足しではなく、責務、境界、依存方向、失敗時の振る舞いを標準的な設計へ戻す。
- main 作業ツリーには書き込まない。監査 worktree で修正し、統合前後に `origin/main` との差分を確認する。
