---
name: run-app
description: NeON Church のアプリを起動・確認する手順。画面を実際に開いて変更を確かめたい、スクリーンショットを撮りたい、アプリが 404/500 で壊れた、Docker のフロント/バックが動いているか確かめたい、というときに使う。
---

# run-app: NeON Church の起動と画面確認

## 大原則: 起動し直さない

このプロジェクトは **docker compose で常時起動している**。
`frontend`（:3000）と `backend`（:8000）はソースをマウントしており、
コードを変更すればホットリロードされる。**通常は何も起動しなくてよい。**

**ホスト側で `npm run dev` / `next dev` / `npm run dev:clean` を実行してはいけない。**
`.next` を Docker と共有しているため、ホストで dev を立てると Docker 側のフロントが壊れる。

`docker compose` 系のコマンドは **リポジトリルート**（メインのチェックアウト）で実行する。
worktree から実行すると compose プロジェクトが分裂して 3000 番を奪い合う。

## 1. 生きているか確認する

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/schema/
```

200 が返れば作業を続けてよい。接続拒否なら次へ。

## 2. 起動していない場合

リポジトリルートで:

```bash
docker compose ps          # 状態確認
docker compose up -d       # 起動
docker compose logs -f frontend   # 起動待ち。"Ready in" が出れば OK
```

## 3. フロントが 404 / 500 で壊れた場合

`.next` の破損。リポジトリルートで:

```bash
docker compose stop frontend
rm -rf frontend/.next
docker compose start frontend
```

## 4. 画面を目で確認する / スクリーンショット

Playwright はフロントのコンテナに入っている。
ホスト側にインストールされていれば、ホストから直接叩いてもよい。

```js
const { chromium } = require('playwright');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:3000/対象パス', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);           // クライアントサイド描画待ち
await page.screenshot({ path: 'shot.png', fullPage: true });
await browser.close();
```

スクリーンショットの保存先はリポジトリ内ではなく一時ディレクトリにする。

確認によく使うパス:

| パス | 画面 |
| --- | --- |
| `/` | トップ |
| `/matthew/1` | 聖書本文（コメントパネルつき） |
| `/articles` | 読み物一覧 |

## 5. API のレスポンスを直接見たい場合

```bash
curl -s http://localhost:8000/api/<endpoint>/ | python3 -m json.tool | head -40
```

バックエンドのログ:

```bash
docker compose logs --tail 50 backend
```
