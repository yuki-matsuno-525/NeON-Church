#!/bin/sh
set -e

python manage.py migrate

# 利用者データが1件も無いときだけ、開発用の軽いシードを投入する。
# 聖書データがまだ入っていない環境ではシードは作れないので、失敗しても起動は続ける。
if ! python manage.py shell -c "
from comments.models import Comment
exit(0 if Comment.objects.exists() else 1)
"; then
    echo "開発用のシードデータを投入します..."
    python manage.py seed_demo --scale small || echo "シードはスキップしました（聖書データ未投入）"
fi

exec python manage.py runserver 0.0.0.0:8000
