"""解釈書の投入（commentary/loader.py・import_commentary コマンド）のテスト。"""

import gzip
import json
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import CanonicalBook
from comments.models import Comment
from commentary.loader import CommentaryDataError, known_book_slugs, load_work, read_seed, validate
from commentary.models import CommentaryChapter, PassageLink, Section, Work
from tests.factories import make_user

SEED_DIR = Path(__file__).resolve().parents[1] / "commentary" / "seed"


def lk(book, chapter, verse=None, verse_end=None, method="structure", confidence=None):
    return {"book": book, "chapter": chapter, "verse": verse, "chapter_end": chapter,
            "verse_end": verse if verse_end is None else verse_end, "method": method, "confidence": confidence}


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
        "chapters": [
            {
                "number": 1,
                "title": "第一講",
                "links": [lk("romans", 8)],  # 章そのものが論じる箇所
                "sections": [
                    {"heading": "", "text": "On the beginning.",
                     "links": [lk("genesis", 1, 1), lk("john", 1, 1, 3, method="citation")]},
                    {"heading": "", "text": "No links here.", "links": []},
                ],
            },
            {"number": 2, "title": "第二講", "links": [], "sections": [{"text": "Second lecture."}]},
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
    def test_creates_chapters_sections_and_links(self):
        work, n_sections, n_links = load_work(make_work())
        assert (n_sections, n_links) == (3, 3)
        assert [(c.number, c.title) for c in work.chapters.all()] == [(1, "第一講"), (2, "第二講")]
        # 区切りは章の中で 1 から番号が振られ、order は本全体の通し番号
        assert [(s.chapter_number, s.number, s.order) for s in work.sections.all()] == [(1, 1, 0), (1, 2, 1), (2, 1, 2)]
        chapter_link = PassageLink.objects.get(commentary_chapter__isnull=False)
        assert (chapter_link.canonical_book.slug, chapter_link.chapter, chapter_link.section_id) == ("romans", 8, None)
        citation = PassageLink.objects.get(method="citation")
        assert (citation.section.number, citation.verse_end) == (1, 3)

    def test_creates_missing_canonical_book(self):
        assert not CanonicalBook.objects.filter(slug="genesis").exists()
        load_work(make_work())
        assert CanonicalBook.objects.filter(slug="genesis").exists()

    def test_reload_replaces_instead_of_duplicating(self):
        load_work(make_work())
        changed = make_work(title="Renamed")
        changed["chapters"] = changed["chapters"][:1]
        work, n_sections, _ = load_work(changed)
        assert Work.objects.count() == 1
        assert work.title == "Renamed"
        assert CommentaryChapter.objects.count() == 1
        assert Section.objects.count() == 2

    @pytest.mark.parametrize(
        "mutate",
        [
            lambda d: d["chapters"][0]["sections"][0]["links"][0].update(book="not-a-book"),
            lambda d: d["chapters"][0]["links"][0].update(method="ai"),  # AI 判定に confidence が無い
            lambda d: d["chapters"][1].update(number=1),  # 章番号の重複
            lambda d: d["chapters"][1].update(sections=[]),  # 区切りの無い章
            lambda d: d["chapters"][1]["sections"][0].update(text=""),
            lambda d: d.update(chapters=[]),
            lambda d: d.update(license="all-rights-reserved"),
            lambda d: d.update(tradition="unknown"),
        ],
    )
    def test_bad_data_is_rejected(self, mutate):
        data = make_work()
        mutate(data)
        with pytest.raises(CommentaryDataError):
            load_work(data)
        assert Work.objects.count() == 0

    def test_ai_link_with_confidence(self):
        data = make_work()
        data["chapters"][0]["sections"][0]["links"][0].update(method="ai", confidence=0.8)
        load_work(data)
        assert PassageLink.objects.get(method="ai").confidence == 0.8


@pytest.mark.django_db
class TestPositionsKept:
    """コメント等が付いている場所の番号・本文を変える入れ直しは止める。"""

    def comment_on(self, work, chapter, number):
        return Comment.objects.create(
            user=make_user(), body="hi", commentary_work=work, chapter_number=chapter, verse_number=number
        )

    def test_same_content_can_be_reloaded(self):
        work, _, _ = load_work(make_work())
        self.comment_on(work, 1, 2)
        load_work(make_work(title="Only the title changed"))
        assert Comment.objects.count() == 1

    def test_changed_text_at_commented_place_is_refused(self):
        work, _, _ = load_work(make_work())
        self.comment_on(work, 1, 2)
        changed = make_work()
        changed["chapters"][0]["sections"][1]["text"] = "Something else."
        with pytest.raises(CommentaryDataError, match="1:2"):
            load_work(changed)
        # 何も変わっていない
        assert Section.objects.get(chapter_number=1, number=2).text == "No links here."

    def test_removed_place_is_refused(self):
        work, _, _ = load_work(make_work())
        self.comment_on(work, 2, None)
        changed = make_work()
        changed["chapters"] = changed["chapters"][:1]
        with pytest.raises(CommentaryDataError, match="2章"):
            load_work(changed)

    def test_changes_elsewhere_are_allowed(self):
        work, _, _ = load_work(make_work())
        self.comment_on(work, 1, 1)
        changed = make_work()
        changed["chapters"][1]["sections"][0]["text"] = "Rewritten second lecture."
        load_work(changed)
        assert Section.objects.get(chapter_number=2, number=1).text == "Rewritten second lecture."

    def test_force_pushes_through(self):
        work, _, _ = load_work(make_work())
        self.comment_on(work, 1, 2)
        changed = make_work()
        changed["chapters"][0]["sections"][1]["text"] = "Something else."
        load_work(changed, force=True)
        assert Section.objects.get(chapter_number=1, number=2).text == "Something else."


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
        assert Section.objects.count() == 3
        assert PassageLink.objects.count() == 3

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
        bad["chapters"][0]["sections"][0]["links"][0]["book"] = "not-a-book"
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
        links = [lk for c in data["chapters"] for lk in c.get("links", [])]
        links += [lk for c in data["chapters"] for s in c["sections"] for lk in s.get("links", [])]
        assert all(link["method"] != "ai" for link in links), path.name
