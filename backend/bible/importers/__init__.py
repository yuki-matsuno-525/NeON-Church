"""書籍テキストの取り込みパイプライン。

設計の要点（形式の違う書にも使い回すための分離）:

    ソースHTML ──[書ごとの parser]──▶ 正規化JSON ──[共通 validate]──▶ OK?
                                            │
                                            └──[共通 loader（将来）]──▶ DB

- parser  … 書（＝ソース形式）ごとに用意する。enoch.parse_enoch() など。
            出力は必ず下記「正規化スキーマ」の dict。
- validate… 正規化スキーマに対する共通チェック。DB に触れないので何度でも安全。
- preview … 正規化スキーマを目視確認用テキストに変換する共通処理。

正規化スキーマ（canonical schema）:

    {
        "book": "The Book of Enoch",       # 書名
        "translation": "R. H. Charles (EN)",
        "order": 700,                       # 表示順
        "source": "Project Gutenberg pg77935",
        "chapters": [
            {"number": 1, "verses": [
                {"number": 1, "text": "..."},
            ]},
        ],
    }

別の書を足すときは「正規化スキーマの dict を返す parser 関数」を1つ書くだけで、
validate / preview（と将来の loader）はそのまま再利用できる。
"""
