# 正式公開・リリース手順

## 公開前ゲート

次をすべて満たしたコミットだけを `main` へ公開する。

1. Backend CI、Frontend CI、E2E Tests が成功している。
2. `pip-audit` と `npm audit --omit=dev --audit-level=high` が成功している。
3. Render PostgreSQL のバックアップが有効で、直近の復元テスト日時を運用メモに残している。
4. Render の `SENTRY_DSN`、SMTP、Google/GitHub OAuth の本番値を確認している。
5. Better Stack の `/healthz/` 監視と通知先を確認している。

## デプロイ

`main` への push で Vercel と Render の自動デプロイを開始する。Backend イメージはビルド時に `collectstatic` を実行し、起動時に migration を適用する。

E2E完了後、`Production Smoke Test` が最大10分間デプロイを待ち、公開画面、DB healthcheck、公開API、Django管理画面と管理画面CSSを検証する。

手元から再確認する場合：

```powershell
./scripts/smoke-production.ps1
```

## ロールバック

1. Vercelで直前の正常DeploymentをPromoteする。
2. Renderで直前の正常DeployをRollbackする。
3. DB migrationを戻す必要がある場合は、先にバックアップを取得し、対象migrationの可逆性を確認する。不可逆ならコードを前方修正する。
4. スモークテストを再実行し、SentryとBetter Stackを確認する。

## DB復元訓練

少なくとも月1回、最新バックアップを本番とは別の一時DBへ復元する。`python manage.py check` と主要テーブルの件数確認後、一時DBを削除し、実施日・所要時間・結果を運用メモへ記録する。本番DBへ直接復元テストをしない。
