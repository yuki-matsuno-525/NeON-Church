# バックエンドの書き方

リポジトリ全体の規則は `../AGENTS.md`（Docker の使い方・コマンド一覧）。
このファイルは **backend/ の中をどう書くか** だけを扱う。

## 1. アプリの中の役割分担

アプリは3〜4個のファイルに分かれている。**どこに何を書くかで迷ったらこの表を見る。**

| ファイル | 置くもの | 置かないもの |
| --- | --- | --- |
| `views.py` | URL とパラメータを解く、権限を通す、シリアライズして返す | 業務ルール、ORM の組み立て |
| `selectors.py` | 「何が誰に見えるか」「どう数えるか」（読み出し） | 状態を変える操作 |
| `services.py` | 状態を変える操作と、そのときのルール | HTTP の都合（`Response` を作らない） |
| `serializers.py` | 入出力の形と、1件の中で完結する検証 | 他の行の状態に依存する判定 |

判断の目安:

- **他の行を見ないと決まらないなら services**。「募集中の企画にしか申し込めない」は
  企画の行を見ないと決まらないので、シリアライザではなく services。
- **`request` が要るなら views**。それ以外は要らないはず。selectors / services は
  `request` ではなく `user` や必要な値を受け取る。
- **`.objects.` が views.py に出てきたら**、たいてい selectors か services へ移せる。

読み取り専用のアプリ（`bible`）には services.py が無い。無くてよい。

## 2. サービス層からのエラーの返し方

services は `Response` を返せないので例外を投げる。DRF の例外ハンドラが HTTP に翻訳する。

```python
from common.exceptions import BadRequest, Conflict
from rest_framework.exceptions import NotFound, PermissionDenied

raise BadRequest("This project is not accepting applications.")  # 400
raise PermissionDenied("Only the owner can perform this action.")  # 403
raise NotFound("Session not found.")  # 404
raise Conflict("Already reported.")  # 409
```

どれも本文は `{"detail": "..."}` になる。ビューが直接 `Response({"detail": ...}, status=...)`
と書いていたのと同じ形なので、既存の API を壊さずに移せる。

**落とし穴**: Django の `Http404("メッセージ")` は使わない。DRF が文言を捨てて
`{"detail": "Not found."}` にしてしまう。文言を残したいときは `rest_framework.exceptions.NotFound`。

## 3. エンドポイントを1本足す手順

1. `models.py` を変えたなら `makemigrations`。既存のマイグレーションは編集しない
2. `serializers.py` に入出力の形を書く
3. 読み出しなら `selectors.py`、書き込みなら `services.py` に中身を書く
4. `views.py` は 3 を呼ぶだけにする
5. **`@extend_schema(request=..., responses={...})` を付ける**（後述）
6. `urls.py` に登録する
7. `tests/` にテストを書く
8. スキーマを生成し直して `schema.yaml` を一緒にコミットする

### スキーマは契約なので必ず埋める

`schema.yaml` はフロントの型の元になる。CI は **警告ゼロ**を要求する（`--fail-on-warn`）。

- `APIView` を使うなら `@extend_schema` は必須。生成側はメソッドの中身を読めない
- `generics.*` なら `serializer_class` を置く。`DestroyAPIView` のように本文を
  返さないビューでも、型を決めるために要る
- 本文なしの応答は `responses={204: None}`、入力を取らない POST は `request=None`
- 複数のモデルをまとめて返すなら、形を宣言するためだけの `serializers.Serializer`
  を書く（例: `bible/serializers.py` の `ReferenceReadResponseSerializer`）。
  dict を直に返すと型が生えない
- `SerializerMethodField` の `get_*` には戻り値の型注釈を付ける。
  **無いと黙って string 扱いになり、フロントに嘘の型が渡る**

## 4. 一覧を書くときの決まり

一覧 API は `tests/test_query_counts.py` が「件数を増やしてもクエリ数が変わらない」
ことを見張っている。落ちたら `select_related` / `prefetch_related` / `annotate` の
どれかが外れている。

- 1件ごとに数える・引く処理は `annotate` で本体クエリに寄せる
- 真偽値は `Exists`、値そのものが要るなら `Subquery`
- `annotate` を足したら `order_by` を明示する。Django が `Meta.ordering` を
  無いものとして扱い、ページングが不安定になったと警告する
- `annotate(**some_dict)` と展開しない。型チェッカが別名を追えず、
  あとの `order_by("-vote_count")` が「そんな列は無い」と誤検出される

一覧を新しく足したら `test_query_counts.py` にも1本足す。

## 5. アプリ間の依存

依存は**一方向**にする。共有されるものは下位のアプリへ出す。

- `tags` … コメントと Q&A が共有するタグ。もとは `comments` が持っていて
  `qa → comments` の依存ができていたので、専用アプリに出した。
  タグを使う側は `from tags.models import Tag` と書く
- `common` … アプリに属さない土台（`BaseModel` / 例外 / 権限 / ページング）

新しく共有したくなったら、片方のアプリに置いて他方から import するのではなく、
どちらにも属さない場所へ出せないか先に考える。

## 6. 触る前に読むもの

- `common/exceptions.py` — サービス層から投げる例外
- `common/permissions.py` — 「持ち主だけ」の判定。アプリごとに書き起こさない
- `common/schema.py` — スキーマ用の共通宣言（`DetailSerializer` など）
- `translations/` — 3層に分けた形の見本。いちばん規模が大きい

## 7. 型チェックの負債

mypy は段階導入で、型注釈の無い関数の中身は見ない。既存の負債は
`pyproject.toml` の `[[tool.mypy.overrides]]` に**理由付きで**列挙してある。

新しく足すモジュールは既定で検査対象になる。負債リストに足すのではなく、
まず直せないか考える。直せないなら理由をコメントに書く。
