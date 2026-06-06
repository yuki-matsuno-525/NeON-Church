# プロジェクトルール

## 開発環境（重要）

- 開発は **docker compose で常時起動**している（frontend:3000 / backend:8000 / db:5432）。アクセスは **http://localhost:3000**。
- **ホスト側で `npm run dev` / `next dev` を絶対に実行しない。** `docker-compose.yml` がフロントを `./frontend:/app` でマウントしており `.next` を共有するため、ホストで dev を立てると Docker のフロントが壊れる（404/500）。さらに CSRF 許可は `http://localhost:3000` のみで、別ポートからの書き込みは弾かれる。
- コード変更は Docker 側で自動ホットリロードされる。動作確認は http://localhost:3000 を見る。
- フロントが壊れたら復旧: `docker compose stop frontend` → `frontend/.next` 削除 → `docker compose start frontend`。

## ステップ完了後の手順

`plan/backlog.md` の各ステップを完了したら、必ず以下を順番に実施する。

1. テストを実行してパスを確認する（backend: pytest / frontend: npm test）
2. `git push` まで実施する
3. `gh run watch` または `gh run list --limit 5` で GitHub Actions のテストがグリーンになったことを確認する
