# ==============================================================
# フロントエンド Dockerfile（開発用）
#
# 本番は Vercel にデプロイするため、このファイルは
# ローカルの docker-compose 開発環境専用。
# ==============================================================

FROM node:22-alpine

WORKDIR /app

# package.json と package-lock.json を先にコピーしてキャッシュを効かせる
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
# docker-compose では volume マウントで上書きされるため、
# イメージには最低限のコードのみ含める。
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
