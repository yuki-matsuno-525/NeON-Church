"""
Coptic SCRIPTORIUM コーパス名 → アプリ表示名・メタデータのマッピング。
import_coptic.py から参照する。
"""

# 処理をスキップするディレクトリ（treebank は他コーパスの部分集合、bible/ は空）
SKIP_DIRS: frozenset[str] = frozenset({"bible", "coptic-treebank", "bohairic-treebank"})

# 複数書を含む聖書コーパス: ファイル名 "{num}_{BookName}_{ch}.conllu" から書名を抽出する
MULTI_BOOK_CORPORA: frozenset[str] = frozenset(
    {"sahidic.ot", "sahidica.nt", "bohairic.ot", "bohairic.nt"}
)

# 単一書の聖書コーパス: (表示書名, 正典番号)
# 正典番号は多書コーパスのファイル名先頭数字と対応する（例: Mark=41）
SINGLE_BOOK_CORPORA: dict[str, tuple[str, int]] = {
    "sahidic.jonah": ("Jonah", 32),
    "sahidic.ruth": ("Ruth", 8),
    "sahidica.1corinthians": ("1 Corinthians", 46),
    "sahidica.mark": ("Mark", 41),
    "bohairic.1corinthians": ("1 Corinthians", 46),
    "bohairic.mark": ("Mark", 41),
    "bohairic.habakkuk": ("Habakkuk", 35),
}

# 非正典・修道士・パピルス類のコーパス: 表示書名
NON_CANONICAL_CORPORA: dict[str, str] = {
    # 外典・偽典
    "acts.pilate": "Acts of Pilate",
    "book.bartholomew": "Book of Bartholomew",
    "dormition.john": "Dormition of John",
    "lament.mary": "Lament of Mary",
    "mysteries.john": "Mysteries of John",
    "pistis.sophia": "Pistis Sophia",
    "thomas.gospel": "Gospel of Thomas",
    # 修道士・聖人伝
    "apophthegmata.patrum": "Apophthegmata Patrum",
    "besa.letters": "Besa: Letters and Sermons",
    "bohairic.lausiac": "Lausiac History",
    "bohairic.life.isaac": "Life of Isaac of Tiphre",
    "bohairic.life.shenoute": "Life of Shenoute",
    "helias": "Life of Elijah",
    "life.aphou": "Life of Aphou",
    "life.cyrus": "Life of Cyrus",
    "life.eustathius.theopiste": "Life of Eustathius and Theopiste",
    "life.john.kalybites": "Life of John the Hut-dweller",
    "life.longinus.lucius": "Life of Longinus and Lucius",
    "life.onnophrius": "Life of Onnophrius",
    "life.paul.tamma": "Life of Paul of Tamma",
    "life.phib": "Life of Phib",
    "life.pisentius": "Life of Pisentius",
    "martyrdom.victor": "Martyrdom of Victor",
    "mercurius": "Life of Mercurius",
    "pachomius.instructions": "Pachomius: Instructions",
    # シェヌーテ文書
    "shenoute.a22": "Shenoute: A22",
    "shenoute.abraham": "Shenoute: Abraham Our Father",
    "shenoute.considering": "Shenoute: Considering",
    "shenoute.crushed": "Shenoute: Crushed",
    "shenoute.dirt": "Shenoute: And It Happened One Day",
    "shenoute.eagerness": "Shenoute: On the Eagerness of Souls",
    "shenoute.errs": "Shenoute: He Who Errs",
    "shenoute.fox": "Shenoute: Not Because a Fox Barks",
    "shenoute.house": "Shenoute: I Am Amazed",
    "shenoute.listen": "Shenoute: Let Us Listen",
    "shenoute.night": "Shenoute: The Lord Thundered at Night",
    "shenoute.place": "Shenoute: Place of Dwelling",
    "shenoute.prince": "Shenoute: The Prince of Evil",
    "shenoute.seeks": "Shenoute: He Who Seeks",
    "shenoute.those": "Shenoute: Those Who Work Evil",
    "shenoute.thundered": "Shenoute: The Lord Thundered",
    "shenoute.true": "Shenoute: True Testimonies",
    "shenoute.uncertain.xr": "Shenoute: Uncertain (XR)",
    "shenoute.unknown5_1": "Shenoute: Unknown 5/1",
    "shenoute.witness": "Shenoute: As I Sat as a Witness",
    # 教父・神学
    "john.constantinople": "John Chrysostom: Homilies",
    "proclus.homilies": "Proclus: Homilies",
    "pseudo.athanasius.discourses": "Pseudo-Athanasius: Discourses",
    "pseudo.basil": "Pseudo-Basil",
    "pseudo.celestinus": "Pseudo-Celestinus",
    "pseudo.chrysostom": "Pseudo-Chrysostom",
    "pseudo.ephrem": "Pseudo-Ephrem",
    "pseudo.flavianus": "Pseudo-Flavianus",
    "pseudo.theophilus": "Pseudo-Theophilus",
    "pseudo.timothy": "Pseudo-Timothy",
    "theodosius.alexandria": "Theodosius of Alexandria",
    # 規則・法典
    "johannes.canons": "Johannes: Canons",
    # パピルス
    "doc.papyri": "Documentary Papyri",
    "magical.papyri": "Coptic Magical Papyri",
}
