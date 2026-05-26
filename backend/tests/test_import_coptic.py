"""
import_coptic 管理コマンドのテスト。

テスト用の最小コーパスディレクトリを tmp_path に作成し、
Book / Chapter / Verse が正しく生成されることを確認する。
"""

import json
import zipfile
from pathlib import Path

import pytest
from django.core.management import call_command

from bible.models import Book, Chapter, Verse
from bible.management.commands.import_coptic import _parse_conllu


# --- CoNLL-U テストデータ ---

MARK_CH1_CONTENT = """\
# newdoc id = sahidica.nt:41_Mark_01
# sent_id = sahidica_nt-41_Mark_01_s0001
# text = ⲧⲁⲣⲭⲏ ⲙⲡⲉⲩⲁⲅⲅⲉⲗⲓⲟⲛ .
# text_en = The beginning of the Good News.
1\tⲧⲁⲣⲭⲏ\t_\tNOUN\tN\t_\t0\troot\t_\t_

# sent_id = sahidica_nt-41_Mark_01_s0002
# text = ⲉⲩⲱⲟⲩⲥⲟⲩⲧⲟⲩ ⲙ̄ⲡϫⲟⲉⲓⲥ .
# text_en = Prepare the way of the Lord.
1\tⲉⲩⲱⲟⲩⲥⲟⲩⲧⲟⲩ\t_\tVERB\tV\t_\t0\troot\t_\t_

"""

AP_001_CONTENT = """\
# newdoc id = apophthegmata.patrum:AP.001.n135.mother
# sent_id = apophthegmata_patrum-AP_001_n135_mother_s0001
# text_en = He saying, "I desire to save my soul."
# text = ⲉⲩⲉ ⲉϥϫⲱ ⲙⲙⲟⲥ .
1\tⲉⲩⲉ\tunknown\tX\tUNKNOWN\t_\t4\tdep\t_\t_

"""

AP_002_CONTENT = """\
# newdoc id = apophthegmata.patrum:AP.002.n136.account
# sent_id = apophthegmata_patrum-AP_002_n136_account_s0001
# text = ⲡⲉϫⲁϥ ⲡⲉ .
1\tⲡⲉϫⲁϥ\t_\tVERB\tV\t_\t0\troot\t_\t_

"""

JONAH_CH1_CONTENT = """\
# newdoc id = sahidic.jonah:Jonah_01
# sent_id = sahidic_jonah-Jonah_01_s0001
# text = ⲡϣⲁϫⲉ ⲙⲡϫⲟⲉⲓⲥ .
# text_en = The word of the LORD came.
1\tⲡϣⲁϫⲉ\t_\tNOUN\tN\t_\t0\troot\t_\t_

"""


def _make_meta(entries: dict) -> str:
    return json.dumps(entries)


# --- _parse_conllu のユニットテスト ---

class TestParseConllu:
    def test_basic(self):
        result = _parse_conllu(MARK_CH1_CONTENT)
        assert len(result) == 2
        assert result[0][0] == "ⲧⲁⲣⲭⲏ ⲙⲡⲉⲩⲁⲅⲅⲉⲗⲓⲟⲛ ."
        assert result[0][1] == "The beginning of the Good News."
        assert result[1][0] == "ⲉⲩⲱⲟⲩⲥⲟⲩⲧⲟⲩ ⲙ̄ⲡϫⲟⲉⲓⲥ ."
        assert result[1][1] == "Prepare the way of the Lord."

    def test_text_en_before_text(self):
        """# text_en が # text より先にある場合も正しく解析できる。"""
        result = _parse_conllu(AP_001_CONTENT)
        assert len(result) == 1
        assert result[0][0] == "ⲉⲩⲉ ⲉϥϫⲱ ⲙⲙⲟⲥ ."
        assert result[0][1] == 'He saying, "I desire to save my soul."'

    def test_no_text_en(self):
        result = _parse_conllu(AP_002_CONTENT)
        assert len(result) == 1
        assert result[0][1] is None

    def test_empty_content(self):
        assert _parse_conllu("") == []

    def test_trailing_sentence_no_blank_line(self):
        """最終文が空行なしで終わる場合も収集される。"""
        content = "# text = ⲧⲁⲣⲭⲏ .\n1\tword\t_\tN\tN\t_\t0\troot\t_\t_"
        result = _parse_conllu(content)
        assert len(result) == 1
        assert result[0][0] == "ⲧⲁⲣⲭⲏ ."


# --- 統合テスト ---

def _build_corpus_dir(root: Path, meta_entries: dict) -> None:
    """meta.json を root に書き出す。"""
    (root / "meta.json").write_text(_make_meta(meta_entries), encoding="utf-8")


@pytest.mark.django_db
class TestImportCopticMultiBook:
    """sahidica.nt 形式（多書コーパス）のインポートテスト。"""

    def test_basic_import(self, tmp_path):
        meta = {
            "41_Mark_01": {
                "corpus": "sahidica.nt",
                "languages": "Sahidic Coptic",
                "chapter": "1",
                "title": "Mark 1",
            }
        }
        _build_corpus_dir(tmp_path, meta)

        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(MARK_CH1_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path))

        book = Book.objects.get(name="Mark", translation="Sahidic Coptic")
        assert book.order == 141   # 100 + 41

        ch1 = Chapter.objects.get(book=book, number=1)
        verses = list(Verse.objects.filter(chapter=ch1).order_by("number"))
        assert len(verses) == 2
        assert verses[0].text == "ⲧⲁⲣⲭⲏ ⲙⲡⲉⲩⲁⲅⲅⲉⲗⲓⲟⲛ ."
        assert verses[1].text == "ⲉⲩⲱⲟⲩⲥⲟⲩⲧⲟⲩ ⲙ̄ⲡϫⲟⲉⲓⲥ ."

    def test_en_translation_saved(self, tmp_path):
        """英訳が別 Book（translation名 + ' (EN)'）として保存される。"""
        meta = {"41_Mark_01": {"corpus": "sahidica.nt", "languages": "Sahidic Coptic"}}
        _build_corpus_dir(tmp_path, meta)

        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(MARK_CH1_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path))

        en_book = Book.objects.get(name="Mark", translation="Sahidic Coptic (EN)")
        ch1_en = Chapter.objects.get(book=en_book, number=1)
        verses_en = list(Verse.objects.filter(chapter=ch1_en).order_by("number"))
        assert len(verses_en) == 2
        assert verses_en[0].text == "The beginning of the Good News."
        assert verses_en[1].text == "Prepare the way of the Lord."

    def test_skip_en_flag(self, tmp_path):
        """--skip-en 時は英訳 Book が作成されない。"""
        meta = {"41_Mark_01": {"corpus": "sahidica.nt", "languages": "Sahidic Coptic"}}
        _build_corpus_dir(tmp_path, meta)

        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(MARK_CH1_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--skip-en")

        assert not Book.objects.filter(translation="Sahidic Coptic (EN)").exists()

    def test_idempotent(self, tmp_path):
        """2回実行しても重複しない。"""
        meta = {"41_Mark_01": {"corpus": "sahidica.nt", "languages": "Sahidic Coptic"}}
        _build_corpus_dir(tmp_path, meta)

        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(MARK_CH1_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--skip-en")
        call_command("import_coptic", str(tmp_path), "--skip-en")

        assert Book.objects.filter(name="Mark", translation="Sahidic Coptic").count() == 1
        book = Book.objects.get(name="Mark", translation="Sahidic Coptic")
        assert Verse.objects.filter(chapter__book=book).count() == 2


@pytest.mark.django_db
class TestImportCopticNonCanonical:
    """AP 形式（非正典コーパス）のインポートテスト。"""

    def test_basic_import(self, tmp_path):
        meta = {
            "AP.001.n135.mother": {
                "corpus": "apophthegmata.patrum",
                "language": "Sahidic Coptic",
                "title": "AP 001",
            },
            "AP.002.n136.account": {
                "corpus": "apophthegmata.patrum",
                "language": "Sahidic Coptic",
                "title": "AP 002",
            },
        }
        _build_corpus_dir(tmp_path, meta)

        ap_dir = tmp_path / "AP" / "apophthegmata.patrum_CONLLU"
        ap_dir.mkdir(parents=True)
        (ap_dir / "AP.001.n135.mother.conllu").write_text(AP_001_CONTENT, encoding="utf-8")
        (ap_dir / "AP.002.n136.account.conllu").write_text(AP_002_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--corpus", "AP")

        book = Book.objects.get(name="Apophthegmata Patrum", translation="Sahidic Coptic")
        # 2ファイル → chapter 1 と chapter 2
        assert Chapter.objects.filter(book=book, number=1).exists()
        assert Chapter.objects.filter(book=book, number=2).exists()

        ch1 = Chapter.objects.get(book=book, number=1)
        verse = Verse.objects.get(chapter=ch1, number=1)
        assert verse.text == "ⲉⲩⲉ ⲉϥϫⲱ ⲙⲙⲟⲥ ."

    def test_en_only_where_present(self, tmp_path):
        """AP.001 は英訳あり、AP.002 は英訳なし → EN book に対応節のみ保存される。"""
        meta = {
            "AP.001.n135.mother": {"corpus": "apophthegmata.patrum", "language": "Sahidic Coptic"},
            "AP.002.n136.account": {"corpus": "apophthegmata.patrum", "language": "Sahidic Coptic"},
        }
        _build_corpus_dir(tmp_path, meta)

        ap_dir = tmp_path / "AP" / "apophthegmata.patrum_CONLLU"
        ap_dir.mkdir(parents=True)
        (ap_dir / "AP.001.n135.mother.conllu").write_text(AP_001_CONTENT, encoding="utf-8")
        (ap_dir / "AP.002.n136.account.conllu").write_text(AP_002_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--corpus", "AP")

        en_book = Book.objects.get(name="Apophthegmata Patrum", translation="Sahidic Coptic (EN)")
        # chapter 1 に英訳節あり
        ch1_en = Chapter.objects.get(book=en_book, number=1)
        assert Verse.objects.filter(chapter=ch1_en).count() == 1
        # chapter 2 には英訳節なし（AP.002 は text_en がない）
        ch2_en = Chapter.objects.get(book=en_book, number=2)
        assert Verse.objects.filter(chapter=ch2_en).count() == 0


@pytest.mark.django_db
class TestImportCopticSingleBook:
    """単一書コーパス（sahidic.jonah 形式）のインポートテスト。"""

    def test_jonah_import(self, tmp_path):
        meta = {
            "Jonah_01": {
                "corpus": "sahidic.jonah",
                "languages": "Sahidic Coptic",
                "chapter": "1",
            }
        }
        _build_corpus_dir(tmp_path, meta)

        jonah_dir = tmp_path / "sahidic.jonah" / "sahidic.jonah_CONLLU"
        jonah_dir.mkdir(parents=True)
        (jonah_dir / "Jonah_01.conllu").write_text(JONAH_CH1_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path))

        book = Book.objects.get(name="Jonah", translation="Sahidic Coptic")
        assert book.order == 132   # 100 + 32
        ch1 = Chapter.objects.get(book=book, number=1)
        assert Verse.objects.filter(chapter=ch1).count() == 1


@pytest.mark.django_db
class TestImportCopticZip:
    """ZIP 形式の CONLLU（sahidic.ot 方式）のインポートテスト。"""

    def test_zip_import(self, tmp_path):
        meta = {
            "01_Genesis_01": {
                "corpus": "sahidic.ot",
                "languages": "Sahidic Coptic",
                "chapter": "1",
            }
        }
        _build_corpus_dir(tmp_path, meta)

        genesis_content = (
            "# newdoc id = sahidic.ot:01_Genesis_01\n"
            "# sent_id = sahidic_ot-01_Genesis_01_s0001\n"
            "# text = ϩⲛⲁⲣⲭⲏ ⲁⲡⲛⲟⲩⲧⲉ ⲧⲁⲙⲓⲉ .\n"
            "# text_en = In the beginning God created.\n"
            "1\tϩⲛⲁⲣⲭⲏ\t_\tADP\tPREP\t_\t3\tcase\t_\t_\n"
            "\n"
        )

        ot_dir = tmp_path / "sahidic.ot"
        ot_dir.mkdir(parents=True)
        zip_path = ot_dir / "sahidic.ot_CONLLU.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("01_Genesis_01.conllu", genesis_content)

        call_command("import_coptic", str(tmp_path))

        book = Book.objects.get(name="Genesis", translation="Sahidic Coptic")
        assert book.order == 101   # 100 + 1
        ch1 = Chapter.objects.get(book=book, number=1)
        verse = Verse.objects.get(chapter=ch1, number=1)
        assert verse.text == "ϩⲛⲁⲣⲭⲏ ⲁⲡⲛⲟⲩⲧⲉ ⲧⲁⲙⲓⲉ ."


@pytest.mark.django_db
class TestImportCopticLicense:
    """--license フラグのテスト。"""

    def _make_warren_wells_conllu(self) -> str:
        return (
            "# newdoc id = sahidica.nt:41_Mark_01\n"
            "# sent_id = sahidica_nt-41_Mark_01_s0001\n"
            "# text = ⲧⲁⲣⲭⲏ .\n"
            "1\tⲧⲁⲣⲭⲏ\t_\tNOUN\tN\t_\t0\troot\t_\t_\n\n"
        )

    def test_license_open_excludes_academic(self, tmp_path):
        """--license open で Warren Wells 文書がスキップされる。"""
        meta = {
            "41_Mark_01": {
                "corpus": "sahidica.nt",
                "languages": "Sahidic Coptic",
                "license": "(c)2000-2006 by J Warren Wells, for academic use only.",
            }
        }
        _build_corpus_dir(tmp_path, meta)
        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(self._make_warren_wells_conllu(), encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--license", "open", "--skip-en")

        assert not Book.objects.filter(name="Mark", translation="Sahidic Coptic").exists()

    def test_license_all_includes_academic(self, tmp_path):
        """--license all（デフォルト）で Warren Wells 文書もインポートされる。"""
        meta = {
            "41_Mark_01": {
                "corpus": "sahidica.nt",
                "languages": "Sahidic Coptic",
                "license": "(c)2000-2006 by J Warren Wells, for academic use only.",
            }
        }
        _build_corpus_dir(tmp_path, meta)
        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(self._make_warren_wells_conllu(), encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--license", "all", "--skip-en")

        assert Book.objects.filter(name="Mark", translation="Sahidic Coptic").exists()

    def test_license_cc_includes_nc(self, tmp_path):
        """--license cc で CC BY-NC-SA 文書がインポートされる。"""
        meta = {
            "AP.001.n135.mother": {
                "corpus": "apophthegmata.patrum",
                "language": "Sahidic Coptic",
                "license": "CC BY-NC-SA 4.0",
            }
        }
        _build_corpus_dir(tmp_path, meta)
        ap_dir = tmp_path / "AP" / "apophthegmata.patrum_CONLLU"
        ap_dir.mkdir(parents=True)
        (ap_dir / "AP.001.n135.mother.conllu").write_text(AP_001_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--license", "cc", "--skip-en")

        assert Book.objects.filter(name="Apophthegmata Patrum", translation="Sahidic Coptic").exists()

    def test_license_open_excludes_nc(self, tmp_path):
        """--license open で CC BY-NC-SA 文書がスキップされる。"""
        meta = {
            "AP.001.n135.mother": {
                "corpus": "apophthegmata.patrum",
                "language": "Sahidic Coptic",
                "license": "CC BY-NC-SA 4.0",
            }
        }
        _build_corpus_dir(tmp_path, meta)
        ap_dir = tmp_path / "AP" / "apophthegmata.patrum_CONLLU"
        ap_dir.mkdir(parents=True)
        (ap_dir / "AP.001.n135.mother.conllu").write_text(AP_001_CONTENT, encoding="utf-8")

        call_command("import_coptic", str(tmp_path), "--license", "open", "--skip-en")

        assert not Book.objects.filter(name="Apophthegmata Patrum").exists()


@pytest.mark.django_db
class TestImportCopticCorpusFilter:
    """--corpus フラグで単一コーパスのみ処理できる。"""

    def test_filter_single_corpus(self, tmp_path):
        meta = {
            "41_Mark_01": {"corpus": "sahidica.nt", "languages": "Sahidic Coptic"},
            "AP.001.n135.mother": {"corpus": "apophthegmata.patrum", "language": "Sahidic Coptic"},
        }
        _build_corpus_dir(tmp_path, meta)

        nt_dir = tmp_path / "sahidica.nt" / "sahidica.nt_CONLLU"
        nt_dir.mkdir(parents=True)
        (nt_dir / "41_Mark_01.conllu").write_text(MARK_CH1_CONTENT, encoding="utf-8")

        ap_dir = tmp_path / "AP" / "apophthegmata.patrum_CONLLU"
        ap_dir.mkdir(parents=True)
        (ap_dir / "AP.001.n135.mother.conllu").write_text(AP_001_CONTENT, encoding="utf-8")

        # AP のみ
        call_command("import_coptic", str(tmp_path), "--corpus", "AP", "--skip-en")

        assert Book.objects.filter(name="Apophthegmata Patrum").exists()
        assert not Book.objects.filter(name="Mark").exists()
