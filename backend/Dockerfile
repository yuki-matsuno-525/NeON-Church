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

# 本番イメージには実行時依存だけを入れる。docker-compose の開発環境だけ
# INSTALL_DEV=true を渡し、pytest と監査ツールも利用できるようにする。
ARG INSTALL_DEV=false
COPY requirements*.txt ./
RUN if [ "$INSTALL_DEV" = "true" ]; then \
      pip install --no-cache-dir -r requirements-dev.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

# ソースコードをコピー
# docker-compose では volume マウントで上書きされるため、
# イメージには最低限のコードのみ含める。
COPY . .

# Django Admin の CSS/JS を WhiteNoise から配信できる状態でイメージに含める。
# 下記は settings の読み込みにだけ必要なビルド専用値で、実行環境では使用しない。
RUN DJANGO_SETTINGS_MODULE=config.settings.prod \
    DJANGO_SECRET_KEY=build-only-secret-key-not-used-at-runtime-000000000000 \
    DJANGO_ALLOWED_HOSTS=localhost \
    CSRF_TRUSTED_ORIGINS=https://localhost \
    CORS_ALLOWED_ORIGINS=https://localhost \
    POSTGRES_DB=build \
    POSTGRES_USER=build \
    POSTGRES_PASSWORD=build \
    POSTGRES_HOST=localhost \
    python manage.py collectstatic --noinput

EXPOSE 8000

# デフォルトコマンド（docker-compose.yml の command で上書き可）
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2"]
