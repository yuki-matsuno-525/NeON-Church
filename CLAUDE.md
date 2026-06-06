# プロジェクトルール

## ステップ完了後の手順

`plan/backlog.md` の各ステップを完了したら、必ず以下を順番に実施する。

1. テストを実行してパスを確認する（backend: pytest / frontend: npm test）
2. `git push` まで実施する
3. `gh run watch` または `gh run list --limit 5` で GitHub Actions のテストがグリーンになったことを確認する
