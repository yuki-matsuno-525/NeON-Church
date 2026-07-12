# ibibles 比較用テキスト（聖書本文データ）

`import_ibibles` 管理コマンドで取り込む聖書本文。1ファイルに全書が入った ibibles.net の
比較用テキスト形式（`=NNN 書名` で書を区切り、各行 `略号 章:節 略号 章:節 本文`）。

各行は「第1参照＝KJV 基準に正規化された章節番号／第2参照＝その版のネイティブ番号」の2重表記で、
importer は第1参照（正規化番号）を使う。よって LXX/ヘブライ語も基準番号に整合して入り、
番号変換層（versification）は不要。

## 収録ファイルと訳名

| ファイル | 訳名（`--translation`） | 内容 | 冊数 | 底本 |
|---|---|---|---|---|
| `jco.txt` | `口語訳` | 日本語・全巻 | 66 | 口語訳（1955／PD） |
| `kjv.txt` | `KJV` | 英語・全巻 | 66 | King James Version（PD） |
| `gtr.txt` | `TR (GRC)` | 新約ギリシャ語 | 27 | Textus Receptus（PD） |
| `jcl.txt` | `文語訳` | 日本語・全巻 | 66 | 文語訳（明治・大正／PD） |
| `lxx.txt` | `LXX (GRC)` | ギリシャ語旧約 | 39 | Septuagint（PD） |
| `hwl.txt` | `WLC (HEB)` | ヘブライ語旧約 | 39 | Leningrad Codex 系（PD） |

底本はいずれもパブリックドメイン。使うのは本文のみ。第二正典（トビト書等）は ibibles の
LXX/HWL には含まれない（旧約39書のみ）。

## 取り込み（ローカル / 本番 Render シェル 共通）

書名の解決に正本 `bible/data/canonical_books.json` を使うため、対象の (訳名, 書名) は登録済みである
必要がある（本リポジトリでは登録済み）。冪等なので複数回流しても安全。

```bash
python manage.py import_ibibles --txt bible/seed/ibibles/jco.txt --translation "口語訳"
python manage.py import_ibibles --txt bible/seed/ibibles/kjv.txt --translation "KJV"
python manage.py import_ibibles --txt bible/seed/ibibles/gtr.txt --translation "TR (GRC)"
python manage.py import_ibibles --txt bible/seed/ibibles/jcl.txt --translation "文語訳"
python manage.py import_ibibles --txt bible/seed/ibibles/lxx.txt --translation "LXX (GRC)"
python manage.py import_ibibles --txt bible/seed/ibibles/hwl.txt --translation "WLC (HEB)"
```

出典: https://download.ibibles.net/ （`{code}.zip` を展開した `books.txt`）。
