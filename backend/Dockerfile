# ==============================================================
# バックエンド Dockerfile
#
# マルチステージビルドは採用しない（開発環境を優先）。
# 本番デプロイは Render の自動ビルドに任せる。
# ==============================================================

FROM python:3.13.15-slim@sha256:9d2e5553305c7c7b0097999bb17187c69b921ccd6bc9d40e4bb5ebe652c00285

# 標準出力をバッファリングしない（ログがリアルタイムで表示される）
ENV PYTHONUNBUFFERED=1

# .pyc ファイルを生成しない（コンテナ内ではキャッシュ不要）
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 依存パッケージのインストール
# requirements.txt を先にコピーしてキャッシュを効かせる
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードをコピー
# docker-compose では volume マウントで上書きされるため、
# イメージには最低限のコードのみ含める。
COPY . .

EXPOSE 8000

# デフォルトコマンド（docker-compose.yml の command で上書き可）
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2"]
