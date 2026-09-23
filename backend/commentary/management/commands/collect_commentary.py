"""解釈書の元データを集めて seed（commentary/seed/*.json.gz）を作る。ローカル専用。

本番では流さない（本番は import_commentary で seed を入れるだけ）。ネットにつなぐものと、
先に手で落としておいたファイルを読むものがある。

    # 注解データベース（教父の抜粋・カテナ・アウレア）
    #   git clone --depth 1 https://github.com/HistoricalChristianFaith/Commentaries-Database.git <cdb>
    #   curl -L -o <tar> https://codeload.github.com/HistoricalChristianFaith/Writings-Database/tar.gz/refs/heads/master
    python manage.py collect_commentary cdb --cdb-dir <cdb> --hcf-tar <tar>

    # CCEL（教父の著作・カルヴァン注解）
    #   https://www.ccel.org/ccel/schaff/{anf01,anf04,npnf102}.xml と
    #   https://www.ccel.org/ccel/calvin/calcom01.xml 〜 calcom45.xml を <ccel> に置く
    python manage.py collect_commentary ccel --ccel-dir <ccel>

    # ネットから直接（Sefaria・旭丘キリスト教会・青空文庫・OGCCL）
    python manage.py collect_commentary rashi
    python manage.py collect_commentary japanese
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from commentary.collectors import cdb, ccel, japanese, sefaria
from commentary.collectors.common import SEED_DIR, summarize, write_seed
from commentary.loader import known_book_slugs, validate


class Command(BaseCommand):
    help = "解釈書の元データを集めて commentary/seed/ を作る（ローカル専用）。"

    def add_arguments(self, parser):
        parser.add_argument("source", choices=["cdb", "ccel", "rashi", "japanese"])
        parser.add_argument("--cdb-dir", help="Commentaries-Database を clone したディレクトリ")
        parser.add_argument("--hcf-tar", help="Writings-Database の tar.gz")
        parser.add_argument("--ccel-dir", help="CCEL の ThML（*.xml）を置いたディレクトリ")
        parser.add_argument("--out", default=str(SEED_DIR), help=f"出力先（既定: {SEED_DIR}）")

    def handle(self, *args, **options):
        source = options["source"]
        works: list[dict] = []
        if source == "cdb":
            if not options["cdb_dir"] or not options["hcf_tar"]:
                raise CommandError("cdb には --cdb-dir と --hcf-tar が要ります")
            root = Path(options["cdb_dir"])
            self.stdout.write("HCF の本文を分類中（機械翻訳を除くため）…")
            hcf_class = cdb.classify_hcf_tarball(Path(options["hcf_tar"]))
            for author in cdb.FATHERS:
                works.append(cdb.collect_father(root, author, hcf_class))
            works.append(cdb.collect_catena(root))
        elif source == "ccel":
            if not options["ccel_dir"]:
                raise CommandError("ccel には --ccel-dir が要ります")
            ccel_dir = Path(options["ccel_dir"])
            for slug in ccel.CCEL_WORKS:
                works.append(ccel.collect_ccel_work(slug, ccel_dir))
            works.append(ccel.collect_calvin(ccel_dir))
        elif source == "rashi":
            works.append(sefaria.collect_rashi())
        elif source == "japanese":
            works += [
                japanese.collect_uchimura_romans(),
                japanese.collect_uchimura_job(),
                japanese.collect_uchimura_yomikata(),
                japanese.collect_fujii_revelation_lectures(),
                japanese.collect_fujii_revelation_studies(),
            ]

        book_slugs = known_book_slugs()
        for data in works:
            validate(data, book_slugs)
            path = write_seed(data, Path(options["out"]))
            self.stdout.write(f"  {summarize(data)} → {path.name}")
        self.stdout.write(self.style.SUCCESS(f"完了: {len(works)} 冊"))
