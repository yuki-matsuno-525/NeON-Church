"""読書プラン（plans）のテスト。"""

import pytest

from plans.models import Plan, PlanDay, PlanSubscription

PLANS_URL = "/api/plans/"
REGISTER_URL = "/api/auth/register/"


def _create_plan(client, **overrides):
    payload = {"title": "7日で読む断食", "description": "断食をめぐる7日。"}
    payload.update(overrides)
    return client.post(PLANS_URL, payload, format="json")


def _add_day(client, plan_id, **overrides):
    payload = {"title": "1日目", "devotional": "はじめに。"}
    payload.update(overrides)
    return client.post(f"{PLANS_URL}{plan_id}/days/", payload, format="json")


@pytest.fixture
def plan_id(auth_client, db):
    return _create_plan(auth_client).data["id"]


@pytest.fixture
def other_client(api_client, other_user_payload, db):
    api_client.post(REGISTER_URL, other_user_payload, format="json")
    return api_client


# ---------------------------------------------------------------------------
# 作る・日を足す
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_プランを作れる(auth_client):
    response = _create_plan(auth_client)

    assert response.status_code == 201
    assert Plan.objects.get(id=response.data["id"]).visibility == "private"


@pytest.mark.django_db
def test_日は末尾に足される(auth_client, plan_id):
    _add_day(auth_client, plan_id)
    second = _add_day(auth_client, plan_id, title="2日目")

    assert second.data["number"] == 2
    assert list(PlanDay.objects.filter(plan_id=plan_id).values_list("number", flat=True)) == [1, 2]


@pytest.mark.django_db
def test_その日に読む章を訳非依存で入れられる(auth_client, plan_id, book):
    day_id = _add_day(auth_client, plan_id).data["id"]

    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/days/{day_id}/",
        {"readings": [{"book": "matthew", "chapter_number": 1}]},
        format="json",
    )

    assert response.status_code == 200
    reading = response.data["readings"][0]
    assert reading["book"] == "matthew"
    assert reading["book_name"] == "マタイによる福音書"


@pytest.mark.django_db
def test_章に訳を指定できる(auth_client, plan_id, book):
    from tests.factories import make_book

    make_book("ΚΑΤΑ ΜΑΘΘΑΙΟΝ", "Nestle 1904 (GRC)", 2, slug="matthew")
    day_id = _add_day(auth_client, plan_id).data["id"]

    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/days/{day_id}/",
        {
            "readings": [
                {"book": "matthew", "chapter_number": 1, "translation": "Nestle 1904 (GRC)"}
            ]
        },
        format="json",
    )

    # あえて原文で読ませる日が作れる
    assert response.data["readings"][0]["book_name"] == "ΚΑΤΑ ΜΑΘΘΑΙΟΝ"


@pytest.mark.django_db
def test_1日に入れられる章は10まで(auth_client, plan_id, book):
    day_id = _add_day(auth_client, plan_id).data["id"]

    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/days/{day_id}/",
        {"readings": [{"book": "matthew", "chapter_number": n} for n in range(1, 12)]},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_章の並びは書き換えるたびに入れ替わる(auth_client, plan_id, book):
    day_id = _add_day(auth_client, plan_id).data["id"]
    url = f"{PLANS_URL}{plan_id}/days/{day_id}/"
    auth_client.patch(
        url,
        {"readings": [{"book": "matthew", "chapter_number": 1}, {"book": "matthew", "chapter_number": 2}]},
        format="json",
    )

    response = auth_client.patch(
        url, {"readings": [{"book": "matthew", "chapter_number": 3}]}, format="json"
    )

    assert [r["chapter_number"] for r in response.data["readings"]] == [3]


# ---------------------------------------------------------------------------
# 公開範囲
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_中身が空のままでは公開できない(auth_client, plan_id):
    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/", {"visibility": "public"}, format="json"
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_日があれば公開できる(auth_client, plan_id):
    _add_day(auth_client, plan_id)

    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/", {"visibility": "public"}, format="json"
    )

    assert response.status_code == 200


@pytest.mark.django_db
def test_下書きは他人から見えない(auth_client, plan_id, other_client):
    response = other_client.get(f"{PLANS_URL}{plan_id}/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_一覧に出るのは公開プランだけ(auth_client, plan_id, api_client):
    response = api_client.get(PLANS_URL)

    assert response.data["results"] == []


# ---------------------------------------------------------------------------
# 編集を凍結する条件
# ---------------------------------------------------------------------------

def _published_plan_with_reader(auth_client, other_client):
    """公開して、別の人が1人読み始めている状態を作る。"""
    plan_id = _create_plan(auth_client).data["id"]
    _add_day(auth_client, plan_id)
    _add_day(auth_client, plan_id, title="2日目")
    auth_client.patch(f"{PLANS_URL}{plan_id}/", {"visibility": "public"}, format="json")
    other_client.post(f"{PLANS_URL}{plan_id}/subscribe/")
    return plan_id


@pytest.mark.django_db
def test_誰も読んでいなければ日を消せる(auth_client, plan_id):
    day_id = _add_day(auth_client, plan_id).data["id"]

    response = auth_client.delete(f"{PLANS_URL}{plan_id}/days/{day_id}/")

    assert response.status_code == 204


@pytest.mark.django_db
def test_読み始めた人がいると日は消せない(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)
    day_id = str(PlanDay.objects.filter(plan_id=plan_id).first().id)

    response = auth_client.delete(f"{PLANS_URL}{plan_id}/days/{day_id}/")

    assert response.status_code == 400


@pytest.mark.django_db
def test_読み始めた人がいても日の中身は直せる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)
    day_id = str(PlanDay.objects.filter(plan_id=plan_id).first().id)

    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/days/{day_id}/", {"title": "書き直した題"}, format="json"
    )

    # 進捗は「第N日」に紐づくので、中身を直しても記録は壊れない
    assert response.status_code == 200
    assert response.data["title"] == "書き直した題"


@pytest.mark.django_db
def test_読み始めた人がいても日は末尾に足せる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)

    response = _add_day(auth_client, plan_id, title="3日目")

    assert response.status_code == 201
    assert response.data["number"] == 3


@pytest.mark.django_db
def test_読み始めた人がいると日を並べ替えられない(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)
    day_ids = [str(d.id) for d in PlanDay.objects.filter(plan_id=plan_id).order_by("-number")]

    response = auth_client.post(
        f"{PLANS_URL}{plan_id}/days/reorder/", {"day_ids": day_ids}, format="json"
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_誰も読んでいなければ日を並べ替えられる(auth_client, plan_id):
    first = _add_day(auth_client, plan_id, title="A").data["id"]
    second = _add_day(auth_client, plan_id, title="B").data["id"]

    response = auth_client.post(
        f"{PLANS_URL}{plan_id}/days/reorder/", {"day_ids": [second, first]}, format="json"
    )

    assert response.status_code == 204
    assert PlanDay.objects.get(id=second).number == 1


@pytest.mark.django_db
def test_著者の注記はいつでも書き換えられる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)

    response = auth_client.patch(
        f"{PLANS_URL}{plan_id}/",
        {"note": "第5日と第6日を入れ違えました。すみません。"},
        format="json",
    )

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# 読む側
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_読み始めて進捗をつけられる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)
    day_id = str(PlanDay.objects.filter(plan_id=plan_id).first().id)

    completed = other_client.post(f"{PLANS_URL}{plan_id}/days/{day_id}/complete/")
    detail = other_client.get(f"{PLANS_URL}{plan_id}/")

    assert completed.status_code == 201
    assert detail.data["days"][0]["completed"] is True
    assert detail.data["subscription"]["is_active"] is True


@pytest.mark.django_db
def test_進捗の印は外せる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)
    day_id = str(PlanDay.objects.filter(plan_id=plan_id).first().id)
    other_client.post(f"{PLANS_URL}{plan_id}/days/{day_id}/complete/")

    other_client.delete(f"{PLANS_URL}{plan_id}/days/{day_id}/complete/")

    detail = other_client.get(f"{PLANS_URL}{plan_id}/")
    assert detail.data["days"][0]["completed"] is False


@pytest.mark.django_db
def test_途中でやめられて読み直せる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)

    other_client.delete(f"{PLANS_URL}{plan_id}/subscribe/")
    stopped = PlanSubscription.objects.get(plan_id=plan_id).is_active

    other_client.post(f"{PLANS_URL}{plan_id}/subscribe/")
    resumed = PlanSubscription.objects.get(plan_id=plan_id).is_active

    assert stopped is False
    assert resumed is True


@pytest.mark.django_db
def test_最初からやり直すと読んだ記録が消える(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)
    day_id = str(PlanDay.objects.filter(plan_id=plan_id).first().id)
    other_client.post(f"{PLANS_URL}{plan_id}/days/{day_id}/complete/")

    other_client.post(f"{PLANS_URL}{plan_id}/restart/")

    detail = other_client.get(f"{PLANS_URL}{plan_id}/")
    assert detail.data["days"][0]["completed"] is False


@pytest.mark.django_db
def test_読んでいるプランの一覧が取れる(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)

    response = other_client.get("/api/plan-subscriptions/")

    assert [str(item["plan"]) for item in response.data] == [plan_id]


@pytest.mark.django_db
def test_日の並びを変えられるかが返る(auth_client, other_client):
    plan_id = _published_plan_with_reader(auth_client, other_client)

    response = auth_client.get(f"{PLANS_URL}{plan_id}/")

    assert response.data["can_reorder_days"] is False


@pytest.mark.django_db
def test_他人のプランは書き換えられない(auth_client, plan_id, other_client):
    response = other_client.patch(f"{PLANS_URL}{plan_id}/", {"title": "乗っ取り"}, format="json")

    assert response.status_code in (403, 404)
