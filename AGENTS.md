# NeON Church — AI エージェント向けプロジェクトルール

このファイルが唯一の正本。`CLAUDE.md` はここを読み込むだけの 1 行ファイル。
ルールを足すときはこのファイルを編集する。

## 1. 開発環境（最重要）

開発は **docker compose で常時起動**している。アクセスは必ず **http://localhost:3000**。

| サービス | ポート | 中身 |
| --- | --- | --- |
| `frontend` | 3000 | Next.js 16（`./frontend` を `/app` にマウント） |
| `backend` | 8000 | Django 5.2 + DRF（`./backend` を `/app` にマウント） |
| `db` | 5432 | PostgreSQL 16 |

`backend` のイメージは `backend/Dockerfile` の **dev ステージ**を使う
（`docker-compose.yml` の `target: dev`）。ruff / mypy / pytest-cov はここにだけ入る。
本番（Render）は最後のステージ production になり、`requirements.txt` のものしか入らない。
`target` を外すと本番用が建ち、コンテナから lint を叩けなくなる。

### 絶対にやらないこと

- **ホスト側で `npm run dev` / `next dev` / `npm run dev:clean` を実行しない。**
  `frontend` はホストの `./frontend` をマウントしており `.next` を Docker と共有する。
  ホストで dev を立てると Docker 側のフロントが壊れる（404 / 500）。
  さらに CSRF 許可は `http://localhost:3000` のみなので、別ポートからの書き込みは弾かれる。
- **worktree（`.claude/worktrees/*`）から `docker compose` を実行しない。**
  compose のプロジェクト名がディレクトリ名から決まるため、別スタックが二重起動して 3000 番を奪い合う。
  Docker 操作はメインのチェックアウト（リポジトリルート）で行う。

### 動作確認のしかた

コード変更は Docker 側で自動ホットリロードされる。ブラウザまたは curl で
http://localhost:3000 を見る。起動し直す必要はほぼない。

フロントが壊れたときの復旧（リポジトリルートで実行）:

```
docker compose stop frontend
rm -rf frontend/.next
docker compose start frontend
```

## 2. コマンド一覧

CI（`.github/workflows/`）と同じものを使う。ローカルで通れば CI も通る。

### バックエンド

```
docker compose exec backend ruff check .                        # CI 1 段目: lint
docker compose exec backend ruff format .                       # 整形（CI は --check で検査）
docker compose exec backend mypy .                              # CI 3 段目: 型チェック
docker compose exec backend pytest                              # テスト
docker compose exec backend python manage.py check              # システムチェック
docker compose exec backend python manage.py makemigrations --check --dry-run
docker compose exec backend python manage.py spectacular --file schema.yaml --validate --fail-on-warn
```

**バックエンドを触ったら `ruff check` → `ruff format` → `mypy` → `pytest` の順で回す。**
lint と型チェックは数秒、テストは 30 秒ほど。先に速いものを通す。
`ruff check --fix` で直せる違反は自動修正される。

`DJANGO_SETTINGS_MODULE` は `backend/pytest.ini` で `config.settings.test` に固定済み。
環境変数を明示的に渡す必要はない。Docker を使わない場合は `backend/` で同じコマンドを直接実行する。

**backend/ の中をどう書くかは `backend/AGENTS.md` に書いてある。**
アプリの層分け（views / selectors / services）、エンドポイントの足し方、
スキーマの埋め方、一覧を書くときの決まり。バックエンドを触る前に読む。

### フロントエンド

```
docker compose exec frontend npm run lint    # CI 1 段目
docker compose exec frontend npm test        # CI 2 段目（vitest run）
docker compose exec frontend npm run build   # CI 3 段目。ここで落ちることが多い
docker compose exec frontend npx playwright test   # E2E
```

**`npm test` だけ通して「テスト OK」と報告しない。** frontend CI は lint → test → build の 3 段。
build は型エラーで落ちるため、フロントを触ったら必ず build まで確認する。

## 3. 作業の進め方

### 着手前に読むもの

- `docs/codebase-guide.md` — 画面 → API → DB の流れ、どの機能がどこにあるかの地図。
  コードを探す前にまずこれを見ると探索が速い。
- `plan/*.md` — 機能ごとの計画・進捗。作業対象の計画ファイルを先に読む。
  日付入りのファイル（`ux-fixes-2026-07.md` など）は完了済みの可能性があるので、
  中の進捗欄を確認してから着手する。

### 計画ファイルのステップを完了したら

`plan/` 配下の計画ファイルに定義されたステップを 1 つ完了するたびに、以下を順番に実施する。
ユーザーから「今回テストと push は不要」と指定がある場合は省略してよい。

1. 該当するテストを実行してパスを確認する（上記コマンド一覧を参照）
2. コミットして `git push` まで実施する
3. GitHub Actions がグリーンになったことを確認する（`gh run watch` / `gh run list --limit 5`）

3 は `git push` 後に PostToolUse フックが自動で監視し、失敗時のみログを返す設定になっている
（`.claude/settings.json`）。フックが動く環境なら手動確認は不要。

## 4. 触るときに注意するもの

- `backend/bible/seed/`、`text/` — 聖書本文の原データ。整形や一括置換をかけない。
- `backend/*/migrations/` — 適用済みマイグレーションは編集しない。新規追加のみ。
  モデルを変えたら `makemigrations --check` が通ることを確認する。
- `.env` — コミットしない。設定を増やしたら `.env.example` にも反映する。
- `frontend/AGENTS.md` — Next.js 16 は学習データと API が異なる。
  フロントを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む。

## 5. 対話

- 日本語で回答する。結論から簡潔に。
- 長いエラーログはそのまま貼らず、原因と対処だけを伝える。
