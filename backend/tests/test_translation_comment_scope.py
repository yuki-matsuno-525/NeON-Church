"""翻訳プロジェクト向けコメントの分離（translation_project スコープ）のテスト。

聖書本体のコメントと翻訳プロジェクトのコメントは、同じ節を指していても
互いに混ざらないことを確認する。
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

COMMENTS_URL = "/api/comments/"


@pytest.fixture
def project(db, book):
    """book を元にした公開翻訳プロジェクト。"""
    from translations.models import TranslationProject
    owner = get_user_model().objects.create_user(username="owner", password="x")
    return TranslationProject.objects.create(
        name="マタイ（やさしい日本語）",
        owner=owner,
        source_book=book,
        target_language="ja-easy",
        status=TranslationProject.STATUS_PUBLISHED,
    )


@pytest.mark.django_db
class TestTranslationCommentScope:
    def test_translation_comment_isolated_from_bible(self, auth_client, verse, project):
        # 翻訳プロジェクト向けのコメントを同じ節に投稿する
        res = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "訳文へのコメント", "translation_project": str(project.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert str(res.data["translation_project"]) == str(project.id)

        # 翻訳スコープでは見える
        res_tr = auth_client.get(
            COMMENTS_URL, {"verse_id": str(verse.id), "translation_project": str(project.id)}
        )
        bodies_tr = [c["body"] for c in res_tr.data["results"]]
        assert "訳文へのコメント" in bodies_tr

        # 聖書本体スコープ（translation_project なし）では見えない
        res_bible = auth_client.get(COMMENTS_URL, {"verse_id": str(verse.id)})
        bodies_bible = [c["body"] for c in res_bible.data["results"]]
        assert "訳文へのコメント" not in bodies_bible

    def test_bible_comment_not_shown_in_translation_scope(self, auth_client, verse, project):
        # 聖書本体のコメント
        auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "原文へのコメント"},
            format="json",
        )
        res_tr = auth_client.get(
            COMMENTS_URL, {"verse_id": str(verse.id), "translation_project": str(project.id)}
        )
        bodies_tr = [c["body"] for c in res_tr.data["results"]]
        assert "原文へのコメント" not in bodies_tr

    def test_reply_inherits_parent_translation_project(self, auth_client, verse, project):
        parent = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "親", "translation_project": str(project.id)},
            format="json",
        )
        reply = auth_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "返信", "parent": parent.data["id"]},
            format="json",
        )
        assert reply.status_code == status.HTTP_201_CREATED
        assert str(reply.data["translation_project"]) == str(project.id)
