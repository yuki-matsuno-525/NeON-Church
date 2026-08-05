"""コメントと Q&A が共有するタグ。

もとは comments アプリが持っていたが、qa からも参照するため
`qa → comments` という依存が生まれていた。タグはどちらにも属さない
共有の語彙なので、専用アプリに出して依存の向きを一方向にする。
"""

from django.db import models

# 投稿画面に最初から並べる語彙。利用者は自由入力ではなくここから選ぶ。
PREDEFINED_TAGS = [
    ("感想", "感想"),
    ("解説", "解説"),
    ("証し", "証し"),
    ("祈り", "祈り"),
    ("考察", "考察"),
]


class Tag(models.Model):
    """コメント・質問に付ける短い分類。

    主キーが UUID ではなく連番なのは、他のモデルと違って BaseModel を
    継承していないため。件数が少なく URL にも出ないので、そのままにしている。
    """

    name = models.CharField(max_length=20, unique=True)

    class Meta:
        # comments アプリから移設したが、テーブル名は据え置く。
        # 名前を変えると本番で ALTER TABLE が要るうえ、デプロイ中の
        # 短い時間だけ旧コードが新テーブル名を見に行けなくなる。
        # 実体は変わらないので、名前だけのために止める価値はない。
        db_table = "comment_tags"

    def __str__(self) -> str:
        return self.name
