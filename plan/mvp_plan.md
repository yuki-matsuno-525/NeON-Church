# 　NeON-Church仕様書
##  サービス概要
Your VersionのようなUI,UXで聖書、外典、偽書を読むことができ、Redditのように議論、コメントができるサービス。MVPは個人開発だが、将来的には集団開発によるスケールを目指す。WEB版が安定したらflutterでモバイル版を製作予定。
## サービス構成
フロントエンド：Next.js
バックエンド：django rest framework
DB：PostgreSQL
##  ドメイン構成
next.js：neon.church.com
drf：api.neon.church.com
（ドメインはこの限りではない）
##  認証方式
・JWT＋HTTP-only Cookieを採用。
・DRF：djangorestframework-simplejwtでトークンを作成し、access_token / refresh_token を HTTP-only Cookie にセット
・Next.js：以後のAPIリクエストでは Cookie を自動送信
・CSRF_TRUSTED_ORIGINSでapi.neon.churchへの送信を許可
・アクセストークンの有効期限：20分
・リフレッシュトークンの有効期限：20日
・本番はSecure Cookie + HTTPS
・CSRF対策は書き込み系APIだけ必須
・refresh token rotationを採用する。
・ログアウト時は Cookie 削除 + refresh token 失効
・複数端末ログインは許可する
##  コンテナ
Docker Composeで
・next.js
・drf
・PostgreSQL
を起動できるようにする
##  サービス監視
- Sentryを使い、バックエンド、フロントエンドでエラー監視。
- JSONによるAPIアクセスログ。
- コメント本文、パスワード、認証トークン、Cookie、メールアドレスなどの機密情報・個人情報はログに出力しない
- ログは構造化し、request_idによってSentryのエラーとAPIアクセスログを紐づけられるようにする
- APIアクセスログには、リクエスト処理の追跡・障害調査・簡易分析に必要な情報のみを記録する
- /healthzをつくって、Better Stackによるuptime monitoring。
##  バックエンド
・drf-spectacularによるOpenAPI生成
・今後の非同期処理（Celery + Redis）追加に備えてservice層を採用。
##  フロントエンド
openapi-typescriptによる型生成
##  リソース設計
・・UUIDを使用
・created_at / updated_atは全モデルに入れる（DBにはUTCで保存、表示は日本時間）
###  書、章、節
・書（MVPでは口語訳の４福音書）を節単位で保持
・DBに格納するときは、ソースごとにimport.pyを作成し、manage.pyから呼び出してDBに格納する。
### コメント
・書、章、節のそれぞれに対するコメント（Reddit風にするため、ツリー構造にする。投稿後は編集不可）
・コメントの論理削除時は、内容を「このコメントは削除されました」として表示する
・コメントは論理削除のみで、物理削除はしない。
・コメントにupvoteのみで評価できる。
・コメントの並び順は、vote数の多い順、もしくは新しい順で選択できるようにする。
・コメントのツリー構造は、親コメントIDを持つことで実現する。
・コメントはbook_id, chapter_id, verse_idで紐づける。
・コメント、書、章、節をブックマークできる。これは認証済みユーザーのみ。
###  ユーザー
・ユーザーはメールアドレスとパスワードで登録
・ユーザーネームは重複を許可しない
・ユーザープロフィールは、ユーザーネーム、自己紹介文、プロフィール画像を持つ。
##  API設計
・書(GET)
・章(GET)
・節(GET)
・コメント(GET, POST, DELETE)
・ユーザー登録(POST)
・ユーザーログイン(POST)
・ユーザーログアウト(POST)
・ブックマーク(GET, POST, DELETE)
・自分のコメント(GET)
・コメントの評価(POST)
##  モデレート
・同一IPからの連続投稿を制限する
・不適切な内容のコメントを報告できるようにする。
##  通知
・コメントへの返信があった場合に、ユーザーに通知する。
・通知一覧を表示できるようにする。
・未読管理
##  デプロイ
Frontend: Vercel
Backend: Render
DB: Render PostgreSQL
Uptime: Better Stack
Error: Sentry
CI/CD: GitHub Actions
##  テスト
test_plan.mdに記載の内容を実装する。