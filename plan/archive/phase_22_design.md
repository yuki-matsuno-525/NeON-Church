# Phase 22 — 共同翻訳 詳細設計

## 要件まとめ

| 項目 | 決定内容 |
|------|---------|
| 作成者 | ログインユーザー誰でも |
| 参加方法 | 参加申請 → オーナー承認 |
| 翻訳粒度 | 節・章・書（複数種類を混在可） |
| 担当割り当て | 1ユニット1人（排他） |
| レビュー | オーナーのみ |
| 公開 | オーナーが公開 → 翻訳プロジェクト一覧で読める |
| 議論掲示板 | ユニット単位・プロジェクト単位で設置 |
| ブックマーク | 翻訳プロジェクトをブックマーク可能 |

---

## データモデル

### TranslationProject
```
id, name, description
owner            → FK(User)
source_book      → FK(Book)  ※翻訳元の書（口語訳等）
target_language  → CharField  例: "en", "ko", "zh"
status           → draft | active | published
created_at, updated_at
```

### TranslationMembership
```
id
project  → FK(TranslationProject)
user     → FK(User)
role     → owner | member
status   → pending | approved | rejected
created_at
```
- `role=owner` のレコードはプロジェクト作成時に自動生成

### TranslationUnit
翻訳対象の1ユニット（節・章・書のいずれか）。

```
id
project      → FK(TranslationProject)
target_type  → verse | chapter | book
verse        → FK(Verse, nullable)
chapter      → FK(Chapter, nullable)
book         → FK(Book, nullable)  ※書全体を訳す場合
assigned_to  → FK(User, nullable)
body         → TextField  ※訳文
status       → todo | in_progress | review | done
created_at, updated_at
```
- `(project, verse)` / `(project, chapter)` / `(project, book)` それぞれで unique 制約

### TranslationComment
議論掲示板。ユニット単位またはプロジェクト全体に紐づく。

```
id
project   → FK(TranslationProject)
unit      → FK(TranslationUnit, nullable)  ※null=プロジェクト全体への投稿
user      → FK(User)
parent    → FK(self, nullable)
body      → TextField
is_deleted → BooleanField
created_at, updated_at
```

### Bookmark（既存モデルの拡張）
`target_type` に `"translation_project"` を追加し、`translation_project` FK カラムを追加。

```diff
+ translation_project → FK(TranslationProject, nullable)
  target_type → verse | comment | translation_project
```

---

## ステータス遷移

```
TranslationUnit:
  todo → in_progress（担当者が着手）
  in_progress → review（担当者が提出）
  review → done（オーナーが承認）
  review → in_progress（オーナーが差し戻し）

TranslationProject:
  draft → active（プロジェクトを公開募集開始）
  active → published（オーナーが公開）
  published → active（公開取り消し）
```

---

## API 設計

### プロジェクト
| Method | URL | 説明 |
|--------|-----|------|
| GET | /api/translations/ | 公開済みプロジェクト一覧（認証不要） |
| POST | /api/translations/ | プロジェクト作成（要認証） |
| GET | /api/translations/{id}/ | プロジェクト詳細 |
| PATCH | /api/translations/{id}/ | 編集（オーナーのみ） |
| POST | /api/translations/{id}/publish/ | 公開（オーナーのみ） |
| POST | /api/translations/{id}/unpublish/ | 公開取り消し（オーナーのみ） |

### メンバーシップ
| Method | URL | 説明 |
|--------|-----|------|
| POST | /api/translations/{id}/join/ | 参加申請 |
| GET | /api/translations/{id}/members/ | メンバー一覧（メンバーのみ） |
| PATCH | /api/translations/{id}/members/{uid}/ | 承認/拒否（オーナーのみ） |
| DELETE | /api/translations/{id}/members/{uid}/ | メンバー除名（オーナーのみ） |

### ユニット
| Method | URL | 説明 |
|--------|-----|------|
| GET | /api/translations/{id}/units/ | ユニット一覧 |
| POST | /api/translations/{id}/units/ | ユニット追加（オーナーのみ） |
| PATCH | /api/translations/{id}/units/{uid}/ | 訳文更新・ステータス更新 |
| POST | /api/translations/{id}/units/{uid}/assign/ | 担当者割り当て（オーナーのみ） |

### 議論
| Method | URL | 説明 |
|--------|-----|------|
| GET | /api/translations/{id}/comments/ | プロジェクト全体コメント |
| POST | /api/translations/{id}/comments/ | 投稿（メンバーのみ） |
| GET | /api/translations/{id}/units/{uid}/comments/ | ユニットコメント |
| POST | /api/translations/{id}/units/{uid}/comments/ | 投稿（メンバーのみ） |

---

## フロントエンド ページ構成

| URL | 内容 |
|-----|------|
| /translations | 公開済みプロジェクト一覧（ブックマークボタン付き） |
| /translations/new | プロジェクト作成フォーム |
| /translations/{id} | プロジェクト詳細（ユニット一覧・進捗・議論） |
| /translations/{id}/read | 公開済み翻訳の閲覧（書のように読む） |

---

## 実装順序（推奨）

1. **バックエンド基盤**
   - TranslationProject / TranslationMembership モデル・マイグレーション
   - プロジェクト CRUD API・参加申請/承認 API

2. **ユニット管理**
   - TranslationUnit モデル・マイグレーション
   - ユニット追加・担当割り当て・訳文投稿・ステータス更新 API

3. **議論掲示板**
   - TranslationComment モデル・API

4. **フロントエンド**
   - /translations 一覧・/translations/new 作成フォーム
   - /translations/{id} 詳細（ユニット一覧・進捗表示・議論）
   - /translations/{id}/read 閲覧ページ

5. **ブックマーク拡張**
   - Bookmark モデルに translation_project 追加

---

## 未解決事項（実装前に決める）

- 翻訳プロジェクト一覧のトップページ導線（Navbar に追加？）
トップページの「翻訳」を「翻訳プロジェクト」にして、それを導線とする。あとはナビバーにも追加
- 閲覧ページのUI（現在の章ページと同じレイアウトを流用？）
流用して
- ユニットを書全体とした場合の訳文入力UI（長文エディタが必要？）
翻訳単位は節のみ。ただ、翻訳プロジェクトとしては書、章、節を単位にできる。例えばマタイ2:12のみの翻訳プロジェクトなども可能。
- 議論掲示板のUI
これはツリー構造いらない
