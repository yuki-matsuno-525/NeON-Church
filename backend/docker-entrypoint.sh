#!/bin/sh
set -e

python manage.py migrate

# シードユーザーが存在しない場合のみシードを投入する
if ! python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
exit(0 if User.objects.filter(username='rev_james_whitfield').exists() else 1)
"; then
    echo "シードデータを投入します..."
    python manage.py seed_en
fi

exec python manage.py runserver 0.0.0.0:8000
