# run-app: NeON-Church フロントエンド起動手順

## 前提

- フロントエンド: Next.js (`frontend/`)
- バックエンド: Django (`backend/`)
- 通常アクセス: `http://localhost:3000`

## フロントエンド起動

### 1. ロックファイル削除（必須）

```bash
rm -f C:/Users/ymats/NeON-Church/frontend/.next/dev/lock
```

または npm スクリプト経由:

```bash
cd C:/Users/ymats/NeON-Church/frontend && npm run dev:clean
```

### 2. ポート確認

ポート 3000 が Chrome などに占有されている場合がある。  
`netstat -ano | grep ":3000 " | grep LISTEN` で LISTEN がなければ、
Chrome が `localhost:3000` のタブを開いているだけなので、ロック削除後に起動すれば 3000 で起動できる。

それでも競合する場合は 3001 で起動される（正常動作）。

### 3. 起動コマンド（バックグラウンド）

```bash
cd C:/Users/ymats/NeON-Church/frontend && npm run dev:clean
```

起動後、`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` が 200 を返すまで待つ（最大10秒）。  
3000 が取れなければ 3001 を試す。

## Playwright による画面確認

```js
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:3000/対象パス', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000); // クライアントサイドレンダリング待ち
```

## バックエンドが必要な場合

バックエンドは通常ユーザーが別ターミナルで起動済み（`http://localhost:8000`）。  
API エラーが出る場合のみ確認する。
