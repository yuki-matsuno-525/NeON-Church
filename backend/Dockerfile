# ==============================================================
# バックエンド Dockerfile
#
# 開発と本番でステージを分ける。
#
#   base        共通の土台。本番の依存（requirements.txt）だけを入れる
#   dev         base に開発用の道具（ruff / mypy / pytest-cov）を足す
#   production  base のまま。**最後のステージ＝既定の出力**
#
# 最後を production にしてあるのは、`--target` を指定せずにビルドしても
# 開発用の道具が混ざらないようにするため。Render がどちらの方法
# （Dockerfile / pip install）でビルドしていても、本番には
# requirements.txt のものしか入らない。
#
# 開発コンテナは docker-compose.yml が `target: dev` で選ぶ。
# ==============================================================

FROM python:3.13-slim AS base

# 標準出力をバッファリングしない（ログがリアルタイムで表示される）
ENV PYTHONUNBUFFERED=1

# .pyc ファイルを生成しない（コンテナ内ではキャッシュ不要）
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 依存パッケージのインストール
# requirements.txt を先にコピーしてキャッシュを効かせる
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードをコピー
# docker-compose では volume マウントで上書きされるため、
# イメージには最低限のコードのみ含める。
COPY . .

EXPOSE 8000

# デフォルトコマンド（docker-compose.yml の command で上書き可）
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2"]


# --------------------------------------------------------------
# 開発用: コンテナから ruff / mypy / pytest を直接叩けるようにする
# （`docker compose exec backend ruff check .` のため）
# --------------------------------------------------------------
FROM base AS dev

# requirements-dev.txt は base の `COPY . .` で既に入っている。
# 中身は `-r requirements.txt` を読み込むが、base で導入済みなので
# 差分（ruff / mypy / stubs / pytest-cov）だけがインストールされる。
RUN pip install --no-cache-dir -r requirements-dev.txt


# --------------------------------------------------------------
# 本番用: base のまま。ここを最後に置くことが既定の安全側になる。
# --------------------------------------------------------------
FROM base AS production
