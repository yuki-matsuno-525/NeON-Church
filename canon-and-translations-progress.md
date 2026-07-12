# 全書追加プロジェクト 進捗管理

旧約・新約の原文と主要訳を投入し、正典スコープを「66冊＋第二正典（外典）」へ拡張する作業の進捗トラッカー。
チェックボックスを埋めながら進める。段階5・6（Bookmark/Comment の箇所移行）は**完了済み**が前提。

---

## 目的とスコープ

- **入れるテキスト（ibibles.net、全て公有底本）**
  | 記号 | 内容 | 番号体系 | 段階8要否 |
  |---|---|---|---|
  | `gtr` | 新約ギリシャ語（公認本文 TR） | 基準 | 不要 |
  | `kjv` | KJV 英語（全巻） | 基準 | 不要 |
  | `jcl` | 文語訳（明治・大正） | 基準 | 不要 |
  | `lxx` | 七十人訳ギリシャ語 | 異番号 | **必要** |
  | `hwl` | ヘブライ語旧約（レニングラード写本系） | 異番号 | **必要** |
  - DL URL: `https://download.ibibles.net/{記号}.zip` ／ 形式: 1書1HTML、`<small>章:節</small> 本文<br><br>`、UTF-8
- **正典スコープ = B（確定）**: プロテスタント66冊（旧約39＋新約27）＋ LXX が含む第二正典（トビト書・ユディト書・知恵の書・シラ書・バルク書・マカバイ記 上下 等）＋ 既存の外典（マリア/幼児トマス/ペテロ/ユダ/エノク/アダムとエバ）
- **UI 方針（確定）**: 書リストは「カテゴリを選ぶ → そのカテゴリの書」のドリルダウン／折りたたみ（80冊超をフラットに出さない）

---

## 確定した決定（ロック）

- [x] 正典スコープ = B（66＋第二正典＋既存外典）
- [x] 新約ギリシャ語は **GTR（公認本文）**。理由: KJV/文語訳の底本と一致し翻訳系譜が一直線／節欠番が少ない／既存 Nestle 1904 と役割を分けられる
- [x] コメント・栞は常に**基準体系**で保存（段階6完了）。版の体系コードはテキスト側だけに持たせる
- [x] ナビは**カテゴリ→書**のドリルダウン方式

---

## フェーズ別チェックリスト

### Phase A. 正典セット定義 & カテゴリ設計 〔基盤・最重要〕
> canonical_books.json（backend の slug の正）と frontend books.ts（表示名/ジャンル/章数）を全書ぶん定義する。ここが最大の山。
>
> **重要な設計事実**: `sync_canonical_books` は JSON の (訳,書名) と DB の Book を**完全一致**で検証する（不一致は CommandError）。よって canonical_books.json に訳×書を書くには**先にその Book を import 済み**である必要がある。→ Phase A の定義は Phase C/D（import）と**縦にセット**で進める（import→JSON→books.ts→sync）。
>
> **KJV 実データから導出済み（66冊・正確な章数）**: 旧約39（索引001-039）＋新約27（101-127）、計31,105節。章数例: Genesis 50 / Psalms 150 / Isaiah 66 / Matthew 28 / Revelation 22。ibibles txt は `=NNN 書名` 区切り＋`略号 章:節 略号 章:節 本文` 形式でパース容易。第二正典は KJV に無く LXX から取得。
- [x] KJV 全66冊の書名・章数・節数を実データから導出（Phase C の importer の元データ）
- [x] `canonical_books.json` に **KJV 66冊**を追加（旧約39＋新約27、slug 確定＝72 canonical/80 edition）
- [ ] 他訳（GTR/文語訳/LXX/HWL）を canonical_books.json に追記（各 import とセット）
- [ ] カテゴリ（genre）を正典向けに再設計（案: 律法/歴史書/詩歌・知恵/大預言書/小預言書/第二正典/福音書/使徒行伝/書簡/黙示録＋既存外典枠）
- [ ] `frontend/src/lib/books.ts` に各書のエントリ（slug/name/englishName/short/totalChapters/genre）を追加＋`GENRE_ORDER` 更新
- [ ] `sync_canonical_books` で全件検証／CI green

**Phase C/D 検証済み**: 汎用インポータ改良（書名は正本 canonical_books.json を単一ソースに）。ローカルで **KJV 全66冊を実データ投入して検証**（66書・31,105節＝KJV一致・canonical 全紐づけ・書名クリーン）。本番投入は Render シェルで `import_ibibles --txt kjv.txt --translation KJV`。

### Phase B. ナビをカテゴリ・ドリルダウン化 〔UI〕
- [x] `books.ts` に62冊追加（旧約39＋新約27の非福音書）＋`GENRE_ORDER` を9カテゴリへ（律法/歴史/詩歌/預言/福音書/使徒・書簡/黙示/旧約偽典）＋genreNames i18n
- [x] `/read` をカテゴリ選択チップ→その書のドリルダウンに
- [x] サイドバーの書リストをカテゴリ折りたたみに（現在の書のカテゴリは自動展開）
- [ ] （後回し可）QA 書フィルタ・検索・翻訳PJ 書選択のカテゴリ対応
- [x] frontend 222 tests pass・lint 0 error（canonicalBooks は json↔books.ts 差分0 で整合確認済み。ローカルはイメージ焼込みの古い json を読むため要注意、CI は実ファイルで green）

### Phase C. 汎用 ibibles インポータ + 縦スライス検証 〔配管〕
- [ ] `import_ibibles` 管理コマンド（`<small>章:節</small>` HTML パース、訳ごとに Book 作成、get_or_create で冪等）
- [ ] 未定義だった書を**1冊だけ**通しで投入（canonical→books.ts→import→読書画面表示）して配管確認
- [ ] importer のテスト（パース・冪等・canonical 紐づけ）

### Phase D. 同番号テキスト投入（段階8不要） 〔GTR / KJV / 文語訳〕
- [ ] GTR（新約ギリシャ語）投入
- [ ] KJV（全巻）投入
- [ ] 文語訳 `jcl`（全巻）投入
- [ ] 訳切替・コメント/栞の訳横断集約が新書でも動くことを確認
- [ ] CI green ＋ 本番投入（Render シェル or seed 経路）

### Phase E. 段階8 versification 変換層 〔異番号対応〕
- [ ] 版（edition）側に**体系コード**を持たせるスキーマ（基準版はコード無し）
- [ ] 基準体系の確定（旧約は英語/プロテスタント番号を基準にする想定＝要判断）
- [ ] ズレ箇所の静的 JSON（`backend/bible/data/versification/*.json`）: 状態は `exact / range / unmapped` の3値
- [ ] 対訳・並列表示で `unmapped` は並列にせず単独表示に倒す
- [ ] 変換層のテスト

### Phase F. 異番号テキスト投入 〔LXX / HWL〕
- [ ] `hwl`（ヘブライ語旧約）投入＋対応表
- [ ] `lxx`（七十人訳）投入＋対応表（第二正典の書も canonical へ）
- [ ] 詩篇オフセット等の代表ズレで対訳表示が崩れないこと確認
- [ ] CI green ＋ 本番投入

### Phase G. 仕上げ
- [ ] 段階9: `books.ts` の slug 重複整理（正を backend canonical へ、order/表示メタは残置可）
- [ ] 本番スモーク（全カテゴリ表示・訳切替・検索・QA・コメント・500なし）
- [ ] このトラッカーを最終更新

---

## 要判断（未確定）

- [ ] Phase A: カテゴリ分類の最終形（大預言書/小預言書を分けるか、第二正典を独立カテゴリにするか）
- [ ] Phase A/E: **旧約の基準番号体系**をどれにするか（英語/プロテスタント番号を基準にし、ヘブライ/LXX を例外変換する想定でよいか）
- [ ] Phase D: 各訳の表示名（translation 文字列。例「文語訳」「KJV」「LXX (GRC)」「WLC (HEB)」「TR (GRC)」）
- [ ] Phase F: 第二正典の各書 slug と英名/和名

---

## 注意点・リスク

- **ライセンス**: 底本（TR/KJV/LXX/文語訳/レニングラード写本）は公有。本文のみ使用で問題なし。ただし投入前に実ファイルの readme を都度確認する
- **番号ズレ**: LXX/HWL は詩篇番号・章分割・書の構成が英語と違う。ここを段階8の JSON で吸収しないと対訳・コメント集約が崩れる（コメントは基準体系保存なので安全側）
- **冊数増**: 10→80冊超。フラットな書リストは UI 崩れの元 → Phase B を Phase A と近接で入れる
- **データ量**: 各 zip 1〜5.5MB。import は get_or_create で冪等、複数回流しても壊れない
- **本番反映**: Render は自動デプロイ後にマイグレーション。データ投入は Render シェルで import を流すか seed 経路

---

## 進め方メモ

- 1PR = 論理単位（Phase 内でも大きければ分割）。低リスクはまとめる。CI green を各段でゲート
- `frontend/src/types/api.ts` と `plan/` の未コミット変更には触れない
- このファイルは `plan/` 回避のためリポジトリ直下に置いている。`plan/` へ移す場合は指示があってから
