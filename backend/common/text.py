"""ユーザーが書いた文章を保存前に整えるヘルパー。

コメント・Q&A の本文で共通して使う。
"""

from rest_framework import serializers

# 本文の上限。各モデルの body の max_length と合わせる。
BODY_MAX_LENGTH = 5000


def clean_body(value: str | None, *, max_length: int = BODY_MAX_LENGTH) -> str:
    """本文を保存前に整える。

    - None / 全空白は ValidationError
    - NULL バイト等の制御文字を除去（ログ・通知メール埋め込み時の事故を防ぐ）
    - 上限長を超える場合は ValidationError

    DB 制約より手前で弾くことで、サーバーエラーではなくフィールド単位のエラーを返す。
    """
    if value is None:
        raise serializers.ValidationError("Body is required.")
    # 改行・タブ以外の制御文字（U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F）を削除
    cleaned = "".join(
        ch for ch in value if ch in ("\n", "\r", "\t") or ord(ch) >= 0x20 and ch != "\x7f"
    )
    cleaned = cleaned.strip()
    if not cleaned:
        raise serializers.ValidationError("Body is required.")
    if len(cleaned) > max_length:
        raise serializers.ValidationError(f"Body must be {max_length} characters or fewer.")
    return cleaned
