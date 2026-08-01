"""記事（articles）のテスト。"""

import pytest

from articles.citations import parse_body, parse_reference
from articles.models import Article, ArticleTag

ARTICLES_URL = "/api/articles/"
TAGS_URL = "/api/article-tags/"
CITING_URL = "/api/articles/citing/"


# ---------------------------------------------------------------------------
# 引用の印の読み取り（DBを使わない）
# ---------------------------------------------------------------------------

def test_文中の参照とブロック引用を読み分ける():
    parsed = parse_body("前置き [[matthew 6:16-18]] のあと {{matthew 6:17}} まで")

    assert [item["kind"] for item in parsed] == ["inline", "block"]
    assert parsed[0]["book_slug"] == "matthew"
    assert parsed[0]["verse_number_start"] == 16
    assert parsed[0]["verse_number_end"] == 18
    # 1節だけの指定は start と end に同じ番号が入る
    assert parsed[1]["verse_number_start"] == 17
    assert parsed[1]["verse_number_end"] == 17


def test_訳の指定を読み取れる():
    parsed = parse_body("{{matthew 6:16|greek}}")

    assert parsed[0]["translation"] == "greek"


def test_章まるごとは参照なら通り引用ブロックでは無視される():
    assert parse_body("[[matthew 6]]")[0]["verse_number_start"] is None
    assert parse_body("{{matthew 6}}") == []


def test_同じ印が2回出てきても1つにまとめる():
    parsed = parse_body("[[matthew 6:16]] …… [[matthew 6:16]]")

    assert len(parsed) == 1


def test_読めない印は黙って無視する():
    assert parse_body("[[まったく違う文字列]]") == []
    assert parse_body("[[matthew]]") == []
    # 逆さまの範囲は読めないものとして扱う
    assert parse_reference("matthew 6:18-16") is None


# ---------------------------------------------------------------------------
# 記事の作成・取得
# ---------------------------------------------------------------------------

@pytest.fixture
def verses(chapter):
    """引用ブロックの本文を出すための節をいくつか作る。"""
    from bible.models import Verse

    return [
        Verse.objects.create(chapter=chapter, number=number, text=f"{number}節の本文")
        for number in range(1, 6)
    ]


def _create_article(client, **overrides):
    payload = {
        "title": "断食について",
        "summary": "断食とは何かをまとめた。",
        "body": "はじめに [[matthew 1:1]] と書く。\n\n{{matthew 1:2-3}}",
        "visibility": "public",
    }
    payload.update(overrides)
    return client.post(ARTICLES_URL, payload, format="json")


@pytest.mark.django_db
def test_記事を作ると引用の索引ができる(auth_client, verses):
    response = _create_article(auth_client)

    assert response.status_code == 201
    article = Article.objects.get(id=response.data["id"])
    assert article.citations.count() == 2
    assert set(article.citations.values_list("kind", flat=True)) == {"inline", "block"}


@pytest.mark.django_db
def test_記事の取得で引用が書名と本文つきで返る(auth_client, api_client, verses):
    created = _create_article(auth_client)

    response = api_client.get(f"{ARTICLES_URL}{created.data['id']}/")

    assert response.status_code == 200
    citations = {item["raw"]: item for item in response.data["citations"]}
    inline = citations["[[matthew 1:1]]"]
    assert inline["found"] is True
    assert inline["label"] == "マタイによる福音書 1:1"
    assert inline["verses"] == []
    block = citations["{{matthew 1:2-3}}"]
    assert [verse["number"] for verse in block["verses"]] == [2, 3]
    assert block["translation"] == "口語訳"


@pytest.mark.django_db
def test_本文を書き換えると索引が作り直される(auth_client, verses):
    created = _create_article(auth_client)
    article_id = created.data["id"]

    auth_client.patch(
        f"{ARTICLES_URL}{article_id}/",
        {"body": "[[matthew 1:4]] だけにする"},
        format="json",
    )

    citations = Article.objects.get(id=article_id).citations.all()
    assert [citation.raw for citation in citations] == ["[[matthew 1:4]]"]


@pytest.mark.django_db
def test_存在しない書の印は索引に入らない(auth_client, verses):
    response = _create_article(auth_client, body="[[nosuchbook 1:1]]")

    article = Article.objects.get(id=response.data["id"])
    assert article.citations.count() == 0


# ---------------------------------------------------------------------------
# 公開範囲
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_下書きは他人から見えない(auth_client, api_client, verses):
    created = _create_article(auth_client, visibility="private", summary="")

    detail = api_client.get(f"{ARTICLES_URL}{created.data['id']}/")
    listing = api_client.get(ARTICLES_URL)

    # ログインしていない人には 401（ログインすれば見られるかもしれないため）。
    assert detail.status_code == 401
    assert listing.data["results"] == []


@pytest.mark.django_db
def test_下書きは他のログイン済みユーザーにも見えない(
    auth_client, api_client, other_user_payload, verses
):
    created = _create_article(auth_client, visibility="private", summary="")
    api_client.post("/api/auth/register/", other_user_payload, format="json")

    detail = api_client.get(f"{ARTICLES_URL}{created.data['id']}/")

    assert detail.status_code == 403


@pytest.mark.django_db
def test_限定公開は一覧に出ないがURLを知っていれば読める(auth_client, api_client, verses):
    created = _create_article(auth_client, visibility="unlisted")

    assert api_client.get(f"{ARTICLES_URL}{created.data['id']}/").status_code == 200
    assert api_client.get(ARTICLES_URL).data["results"] == []


@pytest.mark.django_db
def test_要約が空のままでは公開できない(auth_client, verses):
    response = _create_article(auth_client, summary="", visibility="public")

    assert response.status_code == 400
    assert "summary" in response.data


@pytest.mark.django_db
def test_自分の記事は下書きも一覧で取れる(auth_client, verses):
    _create_article(auth_client, visibility="private", summary="")

    response = auth_client.get(ARTICLES_URL, {"mine": "true"})

    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_他人の記事は書き換えられない(auth_client, api_client, other_user_payload, verses):
    created = _create_article(auth_client)
    api_client.post("/api/auth/register/", other_user_payload, format="json")

    response = api_client.patch(
        f"{ARTICLES_URL}{created.data['id']}/", {"title": "乗っ取り"}, format="json"
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# タグ
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_タグは最初の15個が入っている():
    assert ArticleTag.objects.count() == 15
    assert ArticleTag.objects.filter(slug="fasting").exists()


@pytest.mark.django_db
def test_タグ一覧は記事のあるタグだけ出す(auth_client, verses):
    fasting = ArticleTag.objects.get(slug="fasting")
    _create_article(auth_client, tag_ids=[str(fasting.id)])

    response = auth_client.get(TAGS_URL)

    assert [tag["slug"] for tag in response.data] == ["fasting"]
    assert response.data[0]["article_count"] == 1


@pytest.mark.django_db
def test_タグは3つまで(auth_client, verses):
    tag_ids = [str(tag.id) for tag in ArticleTag.objects.all()[:4]]

    response = _create_article(auth_client, tag_ids=tag_ids)

    assert response.status_code == 400


@pytest.mark.django_db
def test_タグで絞り込める(auth_client, verses):
    fasting = ArticleTag.objects.get(slug="fasting")
    _create_article(auth_client, tag_ids=[str(fasting.id)])
    _create_article(auth_client, title="別の記事")

    response = auth_client.get(ARTICLES_URL, {"tag": "fasting"})

    assert len(response.data["results"]) == 1


# ---------------------------------------------------------------------------
# 節から記事を引く
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_節を引用した公開記事を引ける(auth_client, api_client, verses):
    _create_article(auth_client)

    response = api_client.get(CITING_URL, {"book": "matthew", "chapter": 1, "verse": 3})

    # {{matthew 1:2-3}} の範囲に入っているので拾える
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_引用していない節では記事が出ない(auth_client, api_client, verses):
    _create_article(auth_client)

    response = api_client.get(CITING_URL, {"book": "matthew", "chapter": 1, "verse": 5})

    assert response.data["results"] == []


@pytest.mark.django_db
def test_章まるごとの参照はその章のどの節でも拾う(auth_client, api_client, verses):
    _create_article(auth_client, body="[[matthew 1]]")

    response = api_client.get(CITING_URL, {"book": "matthew", "chapter": 1, "verse": 5})

    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_下書きは節から引いても出てこない(auth_client, api_client, verses):
    _create_article(auth_client, visibility="private", summary="")

    response = api_client.get(CITING_URL, {"book": "matthew", "chapter": 1, "verse": 1})

    assert response.data["results"] == []


# ---------------------------------------------------------------------------
# コメント
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_記事にコメントできる(auth_client, verses):
    created = _create_article(auth_client)
    url = f"{ARTICLES_URL}{created.data['id']}/comments/"

    posted = auth_client.post(url, {"body": "参考になった"}, format="json")
    listing = auth_client.get(url)

    assert posted.status_code == 201
    assert [comment["body"] for comment in listing.data] == ["参考になった"]


@pytest.mark.django_db
def test_コメントの削除は本文を隠すだけ(auth_client, verses):
    created = _create_article(auth_client)
    url = f"{ARTICLES_URL}{created.data['id']}/comments/"
    comment_id = auth_client.post(url, {"body": "消す"}, format="json").data["id"]

    auth_client.delete(f"/api/article-comments/{comment_id}/")

    listing = auth_client.get(url)
    assert listing.data[0]["is_deleted"] is True
    assert listing.data[0]["body"] == "このコメントは削除されました。"
