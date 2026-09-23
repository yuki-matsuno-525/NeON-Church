"""解釈書の投入（commentary/loader.py・import_commentary コマンド）のテスト。"""

import gzip
import json
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import CanonicalBook
from commentary.loader import CommentaryDataError, known_book_slugs, load_work, read_seed, validate
from commentary.models import PassageLink, Section, Work

SEED_DIR = Path(__file__).resolve().parents[1] / "commentary" / "seed"


def make_work(**overrides) -> dict:
    data = {
        "slug": "test-work",
        "title": "Test Work",
        "title_ja": "テストの本",
        "author": "Tester",
        "author_ja": "テスター",
        "year": 1900,
        "tradition": "patristic",
        "language": "en",
        "translator": "",
        "source_name": "Example",
        "source_url": "https://example.org/",
        "license": "public-domain",
        "license_note": "",
        "readable": True,
        "sections": [
            {
                "heading": "Chapter 1",
                "text": "On the beginning.",
                "links": [
                    {"book": "genesis", "chapter": 1, "verse": 1, "chapter_end": 1, "verse_end": 1,
                     "method": "structure", "confidence": None},
                    {"book": "john", "chapter": 1, "verse": 1, "chapter_end": 1, "verse_end": 3,
                     "method": "citation", "confidence": None},
                ],
            },
            {"heading": "Chapter 2", "text": "No links here.", "links": []},
        ],
    }
    data.update(overrides)
    return data


def write_gz(directory: Path, data: dict) -> Path:
    path = directory / f"{data['slug']}.json.gz"
    path.write_bytes(gzip.compress(json.dumps(data, ensure_ascii=False).encode("utf-8")))
    return path


@pytest.mark.django_db
class TestLoadWork:
    def test_creates_work_sections_and_links(self):
        work, n_sections, n_links = load_work(make_work())
        assert (n_sections, n_links) == (2, 2)
        assert work.title_ja == "テストの本"
        assert [s.order for s in work.sections.all()] == [0, 1]
        link = PassageLink.objects.get(method="citation")
        assert (link.canonical_book.slug, link.chapter, link.verse, link.verse_end) == ("john", 1, 1, 3)

    def test_creates_missing_canonical_book(self):
        assert not CanonicalBook.objects.filter(slug="genesis").exists()
        load_work(make_work())
        assert CanonicalBook.objects.filter(slug="genesis").exists()

    def test_reload_replaces_instead_of_duplicating(self):
        load_work(make_work())
        changed = make_work(title="Renamed")
        changed["sections"] = changed["sections"][:1]
        work, n_sections, _ = load_work(changed)
        assert Work.objects.count() == 1
        assert work.title == "Renamed"
        assert Section.objects.count() == 1
        assert PassageLink.objects.count() == 2

    def test_unknown_book_is_rejected(self):
        data = make_work()
        data["sections"][0]["links"][0]["book"] = "not-a-book"
        with pytest.raises(CommentaryDataError):
            load_work(data)
        assert Work.objects.count() == 0

    def test_ai_link_needs_confidence(self):
        data = make_work()
        data["sections"][0]["links"][0]["method"] = "ai"
        with pytest.raises(CommentaryDataError):
            load_work(data)

    def test_ai_link_with_confidence(self):
        data = make_work()
        data["sections"][0]["links"][0].update(method="ai", confidence=0.8)
        load_work(data)
        assert PassageLink.objects.get(method="ai").confidence == 0.8

    @pytest.mark.parametrize("key,value", [("license", "all-rights-reserved"), ("tradition", "unknown")])
    def test_bad_choice_is_rejected(self, key, value):
        with pytest.raises(CommentaryDataError):
            load_work(make_work(**{key: value}))

    def test_empty_text_is_rejected(self):
        data = make_work()
        data["sections"][1]["text"] = ""
        with pytest.raises(CommentaryDataError):
            load_work(data)


@pytest.mark.django_db
class TestImportCommand:
    def test_imports_all_seeds(self, tmp_path):
        write_gz(tmp_path, make_work(slug="a-work"))
        write_gz(tmp_path, make_work(slug="b-work"))
        out = StringIO()
        call_command("import_commentary", "--dir", str(tmp_path), stdout=out)
        assert set(Work.objects.values_list("slug", flat=True)) == {"a-work", "b-work"}
        assert "2 冊" in out.getvalue()

    def test_is_idempotent(self, tmp_path):
        write_gz(tmp_path, make_work())
        call_command("import_commentary", "--dir", str(tmp_path), stdout=StringIO())
        call_command("import_commentary", "--dir", str(tmp_path), stdout=StringIO())
        assert Work.objects.count() == 1
        assert Section.objects.count() == 2
        assert PassageLink.objects.count() == 2

    def test_only(self, tmp_path):
        write_gz(tmp_path, make_work(slug="a-work"))
        write_gz(tmp_path, make_work(slug="b-work"))
        call_command("import_commentary", "--dir", str(tmp_path), "--only", "b-work", stdout=StringIO())
        assert list(Work.objects.values_list("slug", flat=True)) == ["b-work"]

    def test_only_with_unknown_slug_fails(self, tmp_path):
        write_gz(tmp_path, make_work(slug="a-work"))
        with pytest.raises(CommandError):
            call_command("import_commentary", "--dir", str(tmp_path), "--only", "missing", stdout=StringIO())

    def test_dry_run_saves_nothing(self, tmp_path):
        write_gz(tmp_path, make_work())
        out = StringIO()
        call_command("import_commentary", "--dir", str(tmp_path), "--dry-run", stdout=out)
        assert Work.objects.count() == 0
        assert "[dry-run]" in out.getvalue()

    def test_bad_seed_rolls_back_everything(self, tmp_path):
        write_gz(tmp_path, make_work(slug="a-work"))
        bad = make_work(slug="b-work")
        bad["sections"][0]["links"][0]["book"] = "not-a-book"
        write_gz(tmp_path, bad)
        with pytest.raises(CommandError):
            call_command("import_commentary", "--dir", str(tmp_path), stdout=StringIO())
        assert Work.objects.count() == 0

    def test_empty_dir_fails(self, tmp_path):
        with pytest.raises(CommandError):
            call_command("import_commentary", "--dir", str(tmp_path), stdout=StringIO())


def test_committed_seeds_are_valid():
    """リポジトリに入っている seed が全て検証を通ること（本番投入で落ちないように）。"""
    paths = sorted(SEED_DIR.glob("*.json.gz"))
    assert paths, "commentary/seed に seed がありません"
    book_slugs = known_book_slugs()
    for path in paths:
        data = read_seed(path)
        assert data["slug"] == path.name.removesuffix(".json.gz")
        validate(data, book_slugs)
        # AI 判定はまだ本番の seed に入れない（試験は別扱い）
        assert all(lk["method"] != "ai" for s in data["sections"] for lk in s.get("links", [])), path.name
