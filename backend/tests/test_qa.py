"""Q&A（質問・回答）の API テスト。

Q&A はコメントとは別のデータ（qa.Question / qa.Answer）。ここではコメントと
混ざらないこと、箇所が訳非依存で保存されること、ベストアンサーの権限を確かめる。
"""

import pytest
from rest_framework import status

from tests.factories import make_book

REGISTER_URL = "/api/auth/register/"
QUESTIONS_URL = "/api/qa/questions/"
ANSWERS_URL = "/api/qa/answers/"


def question_url(qid):
    return f"{QUESTIONS_URL}{qid}/"


def answers_url(qid):
    return f"{QUESTIONS_URL}{qid}/answers/"


def answer_url(aid):
    return f"{ANSWERS_URL}{aid}/"


def best_answer_url(qid):
    return f"{QUESTIONS_URL}{qid}/best-answer/"


@pytest.fixture
def other_auth_client(db, other_user_payload):
    """別ユーザーの独立したクライアント。"""
    from rest_framework.test import APIClient

    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


@pytest.fixture
def question(auth_client, verse):
    res = auth_client.post(
        QUESTIONS_URL,
        {"title": "なぜ系図から始まるのか", "body": "気になっています", "verse": str(verse.id)},
        format="json",
    )
    assert res.status_code == status.HTTP_201_CREATED
    return res.json()


@pytest.fixture
def answer(other_auth_client, question):
    res = other_auth_client.post(
        ANSWERS_URL,
        {"question": question["id"], "body": "王としての血統を示すためです"},
        format="json",
    )
    assert res.status_code == status.HTTP_201_CREATED
    return res.json()


# ------------------------------------------------------------------
# 質問の投稿
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestQuestionCreate:
    def test_authenticated_user_can_ask(self, auth_client, verse):
        res = auth_client.post(
            QUESTIONS_URL,
            {"title": "題", "body": "本文", "verse": str(verse.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.json()["title"] == "題"

    def test_anonymous_cannot_ask(self, api_client, verse):
        res = api_client.post(
            QUESTIONS_URL,
            {"title": "題", "body": "本文", "verse": str(verse.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_title_is_required(self, auth_client, verse):
        res = auth_client.post(
            QUESTIONS_URL, {"body": "本文", "verse": str(verse.id)}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_blank_title_is_rejected(self, auth_client, verse):
        res = auth_client.post(
            QUESTIONS_URL,
            {"title": "   ", "body": "本文", "verse": str(verse.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_location_is_required(self, auth_client):
        res = auth_client.post(QUESTIONS_URL, {"title": "題", "body": "本文"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_only_one_location_grain_allowed(self, auth_client, verse, chapter):
        res = auth_client.post(
            QUESTIONS_URL,
            {"title": "題", "body": "本文", "verse": str(verse.id), "chapter": str(chapter.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_stores_translation_independent_location(self, auth_client, verse):
        """入力は訳ごとの Verse id でも、保存されるのは訳非依存の箇所。"""
        from qa.models import Question

        auth_client.post(
            QUESTIONS_URL,
            {"title": "題", "body": "本文", "verse": str(verse.id)},
            format="json",
        )
        q = Question.objects.get()
        assert q.canonical_book == verse.chapter.book.canonical_book
        assert q.chapter_number == verse.chapter.number
        assert q.verse_number == verse.number
        # 投稿時に見ていた訳は表示用に控えておく
        assert q.source_translation == verse.chapter.book.translation

    def test_book_level_question(self, auth_client, book):
        from qa.models import Question

        res = auth_client.post(
            QUESTIONS_URL, {"title": "題", "body": "本文", "book": str(book.id)}, format="json"
        )
        assert res.status_code == status.HTTP_201_CREATED
        q = Question.objects.get()
        assert q.chapter_number is None
        assert q.verse_number is None


# ------------------------------------------------------------------
# 質問の一覧・詳細
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestQuestionList:
    def test_anyone_can_list(self, api_client, question):
        res = api_client.get(QUESTIONS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["count"] == 1

    def test_comments_do_not_appear(self, api_client, auth_client, verse):
        """普通のコメントは Q&A 一覧に出ない（データが別なので混ざりようがない）。"""
        auth_client.post(
            "/api/comments/", {"body": "ただの感想", "verse": str(verse.id)}, format="json"
        )
        res = api_client.get(QUESTIONS_URL)
        assert res.json()["count"] == 0

    def test_deleted_question_is_excluded(self, auth_client, api_client, question):
        auth_client.delete(question_url(question["id"]))
        assert api_client.get(QUESTIONS_URL).json()["count"] == 0

    def test_filter_unanswered(self, api_client, question):
        res = api_client.get(QUESTIONS_URL, {"answered": "false"})
        assert res.json()["count"] == 1
        res = api_client.get(QUESTIONS_URL, {"answered": "true"})
        assert res.json()["count"] == 0

    def test_filter_answered_after_best_answer(self, auth_client, api_client, question, answer):
        auth_client.patch(
            best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json"
        )
        assert api_client.get(QUESTIONS_URL, {"answered": "true"}).json()["count"] == 1
        assert api_client.get(QUESTIONS_URL, {"answered": "false"}).json()["count"] == 0

    def test_search_matches_title(self, api_client, question):
        assert api_client.get(QUESTIONS_URL, {"q": "系図"}).json()["count"] == 1
        assert api_client.get(QUESTIONS_URL, {"q": "存在しない語"}).json()["count"] == 0

    def test_filter_by_location(self, api_client, question, verse):
        """読書ページの Q&A タブ用：その節の質問だけを引く。"""
        slug = verse.chapter.book.canonical_book.slug
        res = api_client.get(
            QUESTIONS_URL,
            {"book_slug": slug, "chapter_number": verse.chapter.number, "verse_number": verse.number},
        )
        assert res.json()["count"] == 1
        # 別の節には出ない
        res = api_client.get(
            QUESTIONS_URL, {"book_slug": slug, "chapter_number": verse.chapter.number, "verse_number": 99}
        )
        assert res.json()["count"] == 0

    def test_location_filter_does_not_mix_grains(self, api_client, auth_client, chapter, verse):
        """章の質問を引くとき、節の質問まで混ざらない。"""
        auth_client.post(
            QUESTIONS_URL, {"title": "章の質問", "body": "本文", "chapter": str(chapter.id)}, format="json"
        )
        auth_client.post(
            QUESTIONS_URL, {"title": "節の質問", "body": "本文", "verse": str(verse.id)}, format="json"
        )
        slug = chapter.book.canonical_book.slug
        res = api_client.get(QUESTIONS_URL, {"book_slug": slug, "chapter_number": chapter.number})
        titles = [q["title"] for q in res.json()["results"]]
        assert titles == ["章の質問"]

    def test_book_id_filter_spans_translations(self, api_client, auth_client, verse):
        """別訳の Book id で絞っても、同じ書の質問が引ける（箇所は訳非依存なので）。"""
        other = make_book("Matthew", "kjv", 1, slug=verse.chapter.book.canonical_book.slug)
        auth_client.post(
            QUESTIONS_URL, {"title": "題", "body": "本文", "verse": str(verse.id)}, format="json"
        )
        res = api_client.get(QUESTIONS_URL, {"book_id": str(other.id)})
        assert res.json()["count"] == 1

    def test_detail_returns_full_question(self, api_client, question):
        res = api_client.get(question_url(question["id"]))
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["body"] == "気になっています"
        assert data["book_slug"] == "matthew"
        assert data["location_label"] == "マタイによる福音書 1章 1節"

    def test_answer_count_excludes_deleted(self, other_auth_client, api_client, question, answer):
        assert api_client.get(question_url(question["id"])).json()["answer_count"] == 1
        other_auth_client.delete(answer_url(answer["id"]))
        assert api_client.get(question_url(question["id"])).json()["answer_count"] == 0


# ------------------------------------------------------------------
# 質問の編集・削除
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestQuestionEditDelete:
    def test_owner_can_edit(self, auth_client, question):
        res = auth_client.patch(
            question_url(question["id"]), {"title": "新しい題", "body": "新しい本文"}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["title"] == "新しい題"

    def test_other_user_cannot_edit(self, other_auth_client, question):
        res = other_auth_client.patch(question_url(question["id"]), {"body": "改ざん"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_delete(self, auth_client, question):
        res = auth_client.delete(question_url(question["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_is_soft(self, auth_client, question):
        from qa.models import Question

        auth_client.delete(question_url(question["id"]))
        assert Question.objects.filter(id=question["id"], is_deleted=True).exists()

    def test_other_user_cannot_delete(self, other_auth_client, question):
        res = other_auth_client.delete(question_url(question["id"]))
        assert res.status_code == status.HTTP_403_FORBIDDEN


# ------------------------------------------------------------------
# 回答
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestAnswer:
    def test_authenticated_user_can_answer(self, other_auth_client, question):
        res = other_auth_client.post(
            ANSWERS_URL, {"question": question["id"], "body": "こう思います"}, format="json"
        )
        assert res.status_code == status.HTTP_201_CREATED

    def test_anonymous_cannot_answer(self, api_client, question):
        res = api_client.post(
            ANSWERS_URL, {"question": question["id"], "body": "こう思います"}, format="json"
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_empty_body_is_rejected(self, other_auth_client, question):
        res = other_auth_client.post(
            ANSWERS_URL, {"question": question["id"], "body": "   "}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_is_oldest_first(self, other_auth_client, api_client, question):
        for i in range(3):
            other_auth_client.post(
                ANSWERS_URL, {"question": question["id"], "body": f"回答{i}"}, format="json"
            )
        res = api_client.get(answers_url(question["id"]))
        bodies = [a["body"] for a in res.json()["results"]]
        assert bodies == ["回答0", "回答1", "回答2"]

    def test_deleted_answer_body_is_hidden(self, other_auth_client, api_client, question, answer):
        other_auth_client.delete(answer_url(answer["id"]))
        res = api_client.get(answers_url(question["id"]))
        item = res.json()["results"][0]
        assert item["is_deleted"] is True
        assert item["body"] == ""

    def test_owner_can_edit_answer(self, other_auth_client, question, answer):
        res = other_auth_client.patch(answer_url(answer["id"]), {"body": "直しました"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["body"] == "直しました"

    def test_other_user_cannot_edit_answer(self, auth_client, answer):
        res = auth_client.patch(answer_url(answer["id"]), {"body": "改ざん"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_edit_deleted_answer(self, other_auth_client, answer):
        other_auth_client.delete(answer_url(answer["id"]))
        res = other_auth_client.patch(answer_url(answer["id"]), {"body": "直す"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ------------------------------------------------------------------
# ベストアンサー
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBestAnswer:
    def test_owner_can_set(self, auth_client, question, answer):
        res = auth_client.patch(
            best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK

    def test_owner_can_unset(self, auth_client, question, answer):
        auth_client.patch(best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json")
        res = auth_client.patch(best_answer_url(question["id"]), {"answer_id": None}, format="json")
        assert res.status_code == status.HTTP_200_OK

        from qa.models import Question

        assert Question.objects.get(id=question["id"]).best_answer is None

    def test_non_owner_cannot_set(self, other_auth_client, question, answer):
        res = other_auth_client.patch(
            best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json"
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_set(self, api_client, question, answer):
        res = api_client.patch(
            best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json"
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cannot_pick_answer_of_another_question(self, auth_client, verse, answer):
        other = auth_client.post(
            QUESTIONS_URL, {"title": "別の質問", "body": "本文", "verse": str(verse.id)}, format="json"
        ).json()
        res = auth_client.patch(best_answer_url(other["id"]), {"answer_id": answer["id"]}, format="json")
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_appears_in_list(self, auth_client, api_client, question, answer):
        auth_client.patch(best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json")
        item = api_client.get(QUESTIONS_URL).json()["results"][0]
        assert item["best_answer"]["id"] == answer["id"]

    def test_is_best_flag_in_answer_list(self, auth_client, api_client, question, answer):
        auth_client.patch(best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json")
        item = api_client.get(answers_url(question["id"])).json()["results"][0]
        assert item["is_best"] is True

    def test_deleting_best_answer_clears_it(self, auth_client, other_auth_client, question, answer):
        """ベストアンサーが消されたら「解決済み」表示も外す。"""
        from qa.models import Question

        auth_client.patch(best_answer_url(question["id"]), {"answer_id": answer["id"]}, format="json")
        other_auth_client.delete(answer_url(answer["id"]))
        assert Question.objects.get(id=question["id"]).best_answer is None
