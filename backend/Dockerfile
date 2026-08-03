# ==============================================================
# バックエンド Dockerfile
#
# マルチステージビルドは採用しない（開発環境を優先）。
# 本番デプロイは Render の自動ビルドに任せる。
# ==============================================================

FROM python:3.13-slim

# 標準出力をバッファリングしない（ログがリアルタイムで表示される）
ENV PYTHONUNBUFFERED=1

# .pyc ファイルを生成しない（コンテナ内ではキャッシュ不要）
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 依存パッケージのインストール
# requirements*.txt を先にコピーしてキャッシュを効かせる
#
# 開発コンテナから ruff / mypy を直接叩けるように dev 依存も入れる
# （このイメージは開発用。本番は Render が requirements.txt だけを見る）。
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

# ソースコードをコピー
# docker-compose では volume マウントで上書きされるため、
# イメージには最低限のコードのみ含める。
COPY . .

EXPOSE 8000

# デフォルトコマンド（docker-compose.yml の command で上書き可）
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2"]
