"""解釈書の場所（解釈書・章・区切り）へのコメント・Q&A・お気に入りのテスト。"""

import pytest

from comments.models import Comment
from commentary.loader import load_work

WORK = {
    "slug": "uchimura-romans", "title": "Studies in Romans", "title_ja": "ロマ書の研究", "author": "Uchimura",
    "author_ja": "内村鑑三", "year": 1924, "tradition": "mukyokai", "language": "ja", "translator": "",
    "source_name": "S", "source_url": "https://example.org/", "license": "public-domain", "license_note": "",
    "readable": True,
    "chapters": [
        {"number": 1, "title": "第1講　ロマ書の大意", "title_en": "Lecture 1", "links": [], "sections": [{"text": "一段落目"}, {"text": "二段落目"}]},
        {"number": 2, "title": "第2講", "links": [], "sections": [{"text": "第二講"}]},
    ],
}


@pytest.fixture
def work(db):
    return load_work(dict(WORK))[0]


def post_comment(client, **place):
    return client.post("/api/comments/", {"body": "よい講義", **place}, format="json")


@pytest.mark.django_db
class TestComments:
    def test_section_comment_and_list(self, auth_client, work):
        res = post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=2)
        assert res.status_code == 201, res.content
        c = Comment.objects.get()
        assert (c.commentary_work_id, c.canonical_book_id, c.chapter_number, c.verse_number) == (work.id, None, 1, 2)

        listed = auth_client.get("/api/comments/", {"work_slug": "uchimura-romans", "chapter_number": 1, "verse_number": 2})
        assert [x["id"] for x in listed.json()["results"]] == [str(c.id)]
        # 粒度は分かれる：章へのコメントの一覧には出ない
        chapter = auth_client.get("/api/comments/", {"work_slug": "uchimura-romans", "chapter_number": 1})
        assert chapter.json()["results"] == []

    def test_chapter_and_work_comments(self, auth_client, work):
        assert post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=2).status_code == 201
        assert post_comment(auth_client, commentary_work="uchimura-romans").status_code == 201
        whole = auth_client.get("/api/comments/", {"work_slug": "uchimura-romans"}).json()["results"]
        chapter = auth_client.get("/api/comments/", {"work_slug": "uchimura-romans", "chapter_number": 2}).json()["results"]
        assert len(whole) == 1 and len(chapter) == 1

    @pytest.mark.parametrize("place", [
        {"commentary_work": "uchimura-romans", "commentary_chapter": 9},
        {"commentary_work": "uchimura-romans", "commentary_chapter": 1, "commentary_number": 99},
        {"commentary_work": "uchimura-romans", "commentary_number": 1},
        {"commentary_work": "no-such-work"},
    ])
    def test_missing_place_is_rejected(self, auth_client, work, place):
        assert post_comment(auth_client, **place).status_code == 400
        assert Comment.objects.count() == 0

    def test_reply_must_be_same_place(self, auth_client, work):
        parent = post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=1).json()
        ok = post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=1,
                          parent=parent["id"])
        assert ok.status_code == 201
        ng = post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=2,
                          parent=parent["id"])
        assert ng.status_code == 400

    def test_my_comments_label(self, auth_client, work):
        post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=2)
        c = Comment.objects.get()
        from comments.serializers import MyCommentSerializer

        assert MyCommentSerializer(c).data["location_label"] == "ロマ書の研究 › 第1講　ロマ書の大意 › 2"


@pytest.mark.django_db
class TestQuestions:
    def test_ask_and_list(self, auth_client, work):
        res = auth_client.post("/api/qa/questions/", {
            "title": "大意とは", "body": "教えてください", "commentary_work": "uchimura-romans", "commentary_chapter": 1,
        }, format="json")
        assert res.status_code == 201, res.content
        data = res.json()
        assert data["commentary_work_slug"] == "uchimura-romans"
        assert data["book_slug"] == ""
        assert data["location_label"] == "ロマ書の研究 › 第1講　ロマ書の大意"

        # 英語の画面では、英題と英語の章名で出す
        en = auth_client.get("/api/qa/questions/", {"work_slug": "uchimura-romans", "chapter_number": 1},
                             HTTP_ACCEPT_LANGUAGE="en").json()
        assert en["results"][0]["location_label"] == "Studies in Romans › Lecture 1"

        listed = auth_client.get("/api/qa/questions/", {"work_slug": "uchimura-romans", "chapter_number": 1}).json()
        assert [q["title"] for q in listed["results"]] == ["大意とは"]

    def test_missing_place_is_rejected(self, auth_client, work):
        res = auth_client.post("/api/qa/questions/", {
            "title": "t", "body": "b", "commentary_work": "uchimura-romans", "commentary_chapter": 5,
        }, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestBookmarks:
    def add(self, client, **place):
        return client.post("/api/bookmarks/", {"commentary_work": "uchimura-romans", **place}, format="json")

    def test_add_list_and_duplicate(self, auth_client, work):
        assert self.add(auth_client, commentary_chapter=1, commentary_number=2).status_code == 201
        assert self.add(auth_client, commentary_chapter=1, commentary_number=2).status_code == 409
        assert self.add(auth_client, commentary_chapter=1).status_code == 201
        assert self.add(auth_client).status_code == 201

        chapter = auth_client.get("/api/bookmarks/", {"work": "uchimura-romans", "chapter": 1}).json()["results"]
        refs = {(b["commentary_reference"]["chapter"], b["commentary_reference"]["number"]) for b in chapter}
        assert refs == {(1, None), (1, 2)}
        assert all(b["target_type"] == "commentary" for b in chapter)
        assert chapter[0]["reference"] is None

        whole = auth_client.get("/api/bookmarks/", {"work": "uchimura-romans"}).json()["results"]
        assert [b["commentary_reference"]["label"] for b in whole] == ["ロマ書の研究"]

    def test_type_tab(self, auth_client, work):
        self.add(auth_client, commentary_chapter=1, commentary_number=1)
        data = auth_client.get("/api/bookmarks/", {"type": "commentary"}).json()
        assert data["counts"]["commentary"] == 1
        assert len(data["results"]) == 1

    def test_missing_place_is_rejected(self, auth_client, work):
        assert self.add(auth_client, commentary_chapter=1, commentary_number=9).status_code in (400, 409)


@pytest.mark.django_db
def test_reply_notification_points_to_commentary(auth_client, work, other_user_payload):
    """解釈書の場所へのコメントへの返信通知は、その解釈書の場所へ飛べる。"""
    from rest_framework.test import APIClient

    from notifications.models import Notification
    from notifications.serializers import NotificationSerializer

    parent = post_comment(auth_client, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=2).json()
    other = APIClient()
    assert other.post("/api/auth/register/", other_user_payload, format="json").status_code in (200, 201)
    reply = post_comment(other, commentary_work="uchimura-romans", commentary_chapter=1, commentary_number=2,
                         parent=parent["id"])
    assert reply.status_code == 201, reply.content
    data = NotificationSerializer(Notification.objects.get()).data
    assert data["target_kind"] == "commentary_comment"
    assert data["commentary_work"] == "uchimura-romans"
    assert (data["chapter_number"], data["verse_number"]) == (1, 2)
    assert data["commentary_label"] == "ロマ書の研究 › 第1講　ロマ書の大意 › 2"
