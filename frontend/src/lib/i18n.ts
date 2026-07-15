"use client";

import { useLang } from "@/contexts/LanguageContext";
import { getBookBySlug } from "@/lib/books";
import { BIBLE_TRANSLATIONS, translationLabel } from "@/lib/translations";

const ja = {
  // 共通
  loading: "読み込み中...",
  saving: "保存中...",
  posting: "投稿中...",
  cancel: "キャンセル",
  close: "閉じる",
  save: "保存",
  remove: "解除",
  undo: "元に戻す",
  prev: "前",
  next: "次",
  all: "すべて",
  add: "追加",
  delete: "削除",
  status: "状態",
  approve: "承認",
  reject: "拒否",
  replies: "返信",
  seeAll: "すべて見る →",
  backToTop: "ページ上部へ",
  chapter: "章",
  verse: "節",
  chapterFmt: (n: number) => `第${n}章`,
  verseFmt: (chapter: number, verse: number) => `${chapter}章${verse}節`,
  chapterVerseFmt: (book: string, chapter: number, verse: number) => `${book} ${chapter}章${verse}節 →`,

  // ナビゲーション
  menuOpen: "メニューを開く",
  read: "読む",
  qa: "Q&A",
  translate: "翻訳",
  compilation: "編纂",
  bookmarks: "お気に入り",
  notifications: "通知",
  profile: "プロフィール",
  logout: "ログアウト",
  login: "ログイン",
  register: "新規登録",
  searchPlaceholder: "検索...",
  bookSearchLabel: "書を検索",
  bookSearchPlaceholder: "書名・略称・英語名で検索",
  listSearchEmpty: "一致する書がありません。",
  books: "書",

  // ホーム
  homeTagline: "ひとつの権威ではなく、\n開かれた場として。",
  homeDesc: "複数のテキスト、解釈、歴史、断片が接続されるキリスト教へ。あらゆるテキストを、隔てなく読み、議論し、翻訳する。",
  todayVerse: "今日の聖句",
  verseUnavailable: "本日の聖句を取得できませんでした",
  trending: "トレンド",
  recentQA: "最近のQ&A",
  aboutLink: "NeON Church について",
  compilationLoginTitle: "ログインして編纂を始める",
  compilationLoginDesc: "節や本文を集めて自分の書を作るにはログインが必要です。",

  // 読む
  readTitle: "聖書を読む",
  resumeReading: (bookName: string, chapter: number) => `続きから読む — ${bookName} 第${chapter}章 ›`,
  selectBook: "書を選択",
  totalChapters: (n: number) => `全${n}章`,
  myTranslationsHeading: "本棚",
  addToLibrary: "本棚に追加",
  removeFromLibrary: "本棚から削除",

  // 章ページ
  bookList: "書一覧",
  toComments: "章コメントへ ↓",
  markShorterEnding: "短い結び",
  switchTranslation: (label: string) => `${label} に切り替え`,
  translationNotFound: (name: string) => `「${name}」のデータが見つかりません。別の翻訳に切り替えてください。`,

  // お気に入り
  bookmarksTitle: "お気に入り",
  noBookmarks: "お気に入りはまだありません。",
  commentBy: (username: string) => `コメント by ${username}`,

  // 通知
  notificationsTitle: "通知",
  markAllRead: "すべて既読",
  noNotifications: "通知はありません。",
  notifReply: "返信",
  notifUpvote: "いいね",

  // Q&A
  qaTitle: "Q&A",
  askQuestion: "質問する",
  qaDesc: "聖書に関する質問・疑問のコメント一覧です。",
  qaFilters: "絞り込み",
  qaSearchLabel: "質問を検索",
  qaSearchPlaceholder: "質問を検索",
  qaQuestionCount: (n: number) => `${n}件`,
  qaEmpty: "Q&Aコメントはまだありません。",
  filterAll: "すべて",
  filterUnanswered: "未解決",
  filterAnswered: "解決済み",
  answerQuestion: "回答する",
  qaColAnsweredDesc: "ベストアンサーが選ばれた質問",
  qaColUnansweredDesc: "まだ解決していない質問",
  qaEmptyColumn: "この状態の質問はありません",
  allBooks: "すべての書",
  allVersions: "すべての訳",
  allTags: "すべてのタグ",
  tagNames: {
    "感想": "感想",
    "解説": "解説",
    "証し": "証し",
    "祈り": "祈り",
    "考察": "考察",
  } as Record<string, string>,

  // 検索
  searchTitle: "検索",
  searchKeyword: "キーワードを入力...",
  searchMinChars: "2文字以上入力してください。",
  searching: "検索中...",
  searchResults: (q: string, n: number) => `「${q}」の検索結果: ${n} 件`,
  searchEmpty: (q: string) => `「${q}」に一致する結果が見つかりませんでした。`,
  sectionBooks: "書名",
  sectionVerses: "節",
  sectionComments: "コメント（最大20件）",
  searchLoadMore: (n: number) => `もっと見る（残り${n}件）`,
  readLink: "読む →",

  // ログイン
  loginTitle: "ログイン",
  username: "ユーザー名",
  password: "パスワード",
  loggingIn: "ログイン中...",
  loginFailed: "ログインに失敗しました",
  noAccount: "アカウントをお持ちでない方は",
  oauthOr: "または",
  oauthGoogle: "Google でログイン",
  oauthGithub: "GitHub でログイン",
  oauthError: "ソーシャルログインに失敗しました。もう一度お試しください。",
  sessionExpiredTitle: "セッションが切れました",
  sessionExpiredDesc: "もう一度ログインしてください。",

  // 登録
  registerTitle: "新規登録",
  email: "メールアドレス",
  passwordHint: "パスワード（8文字以上）",
  registering: "登録中...",
  registerBtn: "登録する",
  registerFailed: "登録に失敗しました",
  hasAccount: "すでにアカウントをお持ちの方は",

  // プロフィール
  profileTitle: "プロフィール",
  joinedDate: "登録日",
  bio: "自己紹介",
  bioPlaceholder: "自己紹介を入力してください",
  profileUpdated: "プロフィールを更新しました。",
  profileUpdateFailed: "更新に失敗しました。もう一度お試しください。",
  tabBookmarks: "お気に入り",
  tabComments: "コメント",
  noMyBookmarks: "お気に入りはまだありません。",
  noMyComments: "コメントはまだありません。",

  // About
  aboutTitle: "NeON Church について",
  aboutSubtitle: "テキストと解釈が交差する、新しいキリスト教的プラットフォーム",
  aboutSection1Title: "コンセプト",
  aboutSection1Body: "「日本的なキリスト教」とは何か。\nその問いについて考えるなかで、私は内村鑑三の「無教会主義（Non-Church）」にたどり着きました。\n\n一方で、もともとポストモダン思想にも関心があり、東浩紀の『動物化するポストモダン』から影響を受けるなかで、「データベース的なキリスト教」という構想を抱くようになりました。キリスト教を、ひとつの固定された制度や権威としてではなく、複数のテキスト、解釈、歴史、断片が接続される開かれた場として捉えることはできないか。NeON Churchは、その問いから生まれたプロジェクトです。\n\nこの構想によって、保守的なキリスト教と、ポストモダン以後の思想とのあいだに、新しい接点を見出せるのではないかと考えています。また、歴史のなかで正典の外に置かれてきた文書や、周縁化されてきた解釈にも光を当てることを目指しています。\n\n「NeON」という名前は、ギリシャ語で「新しい」を意味する neos に由来する元素名 “neon” から来ています。そして同時に、大文字で記された N・O・N が示すように、それは冒頭で触れた「無教会（Non-Church）」の “Non” からも来ています。「新しさ」と「無教会」——この名前は、その二つの含意を重ね持っているのです。さらにそれは、背景画像が示唆するように、東京のネオン街に象徴される雑種性、人工性、混沌、そして新しさのイメージとも重なっています。\n\nNeON Churchは、制度としての教会ではなく、テキストと解釈が交差する、新しいキリスト教的プラットフォームです。",
  aboutSection2Title: "主な機能",
  aboutFeatures: [
    "収録するすべての文書の節・章・書へのコメント投稿と返信",
    "Q&A — 疑問をコメントとして投稿し、ベストアンサーを選定",
    "全文検索 — 節テキスト・コメント・書名を横断検索",
    "コメントや節をお気に入りに保存",
    "読書進捗の自動記録（前回の続きから読める）",
    "コメントへの投票（upvote）と通知機能",
    "共同翻訳プロジェクト — チームで聖書を翻訳",
  ],
  aboutSection3Title: "今後の予定",
  aboutPlanned: ["収録文書の拡充", "翻訳対訳ビュー — 複数翻訳を並べて読む", "プロフィール画像"],
  backToHome: "← トップへ戻る",

  // 翻訳プロジェクト一覧
  translationsTitle: "翻訳プロジェクト",
  translationsDesc: "聖書の共同翻訳プロジェクト一覧",
  projectSearchLabel: "プロジェクトを検索",
  projectSearchPlaceholder: "プロジェクト名・説明・書名で検索",
  newProject: "＋ 新規作成",
  colDraftLabel: "下書き",
  colPublishedDesc: "公開・リリース済みのプロジェクト",
  colActiveDesc: "進行中のプロジェクト",
  colDraftDesc: "計画中・下書きのプロジェクト",
  emptyColumn: "このステータスのプロジェクトはありません",
  noProjects: "まだ公開されたプロジェクトはありません。",
  createFirst: "最初のプロジェクトを作成する →",
  statusActive: "進行中",
  statusPublished: "公開済み",
  createdBy: "作成:",
  progress: "進捗:",
  translationLanguage: "言語:",

  // 新規翻訳作成
  newTranslationTitle: "新規翻訳プロジェクト",
  backToTranslations: "← 翻訳プロジェクト一覧",
  projectName: "プロジェクト名 *",
  projectNamePlaceholder: "例: マタイ英語翻訳",
  description: "説明",
  descPlaceholder: "プロジェクトの目的や方針を記述（任意）",
  bibleVersion: "聖書バージョン *",
  sourceBook: "翻訳元の書 *",
  selectBookOption: "書を選択...",
  targetLanguage: "翻訳先言語 *",
  selectLangOption: "言語を選択...",
  creating: "作成中...",
  createProject: "プロジェクトを作成",
  createFailed: "作成に失敗しました。もう一度お試しください。",
  createMissingFields: "プロジェクト名・元書・翻訳先の言語をすべて入力してください。",

  // 必須項目の未入力メッセージ。無言で止まったり、ボタンが押せないだけだと
  // 何が足りないのか分からないため、送信時に不足している項目を名指しする。
  missingFields: (fields: string[]) => `${fields.join("・")}を入力してください。`,
  fieldTitle: "タイトル",
  fieldBody: "本文",
  fieldChapter: "章",

  // 翻訳詳細
  units: "ユニット",
  review: "レビュー",
  members: "メンバー",
  addAllChapters: "全章を一括追加",
  adding: "追加中…",
  deleteAllUnits: "全ユニット削除",
  deleting: "削除中…",
  addUnit: "＋ ユニット追加",
  selectChapter: "章を選択",
  addAllVerses: "全節を追加",
  noUnitsMsg: "ユニットを追加してください。",
  noUnits: "まだユニットがありません。",
  backToChapters: "章一覧に戻る",
  assignee: "担当:",
  statusPending: "未着手",
  statusInProgress: "進行中",
  statusInReview: "レビュー中",
  statusDone: "完了",
  noAssignee: "担当者なし",
  assigneeLabel: "担当者",
  statusFieldLabel: "ステータス",
  sourceText: "元テキスト",
  translationText: "訳文",
  translationPlaceholder: "訳文を入力してください…",
  notTranslatedYet: "未翻訳",
  editTranslation: "訳文編集",
  sendBack: "差し戻し",
  closeDiscussion: "▲ 議論を閉じる",
  openDiscussion: "▼ 議論を見る",
  mentionPlaceholder: "@メンション可。Shift+Enterで改行...",
  sendComment: "送信",
  noReviewUnits: "レビュー中の節はありません。",
  openReviewTarget: "該当ユニットへ",
  confirmApproveTitle: "この訳を承認しますか？",
  confirmApproveDesc: "承認するとこの節のステータスが「完了」になります。",
  membersOnly: "メンバーのみ閲覧できます。",
  roleOwner: "オーナー",
  roleMember: "メンバー",
  statusApproved: "承認済み",
  statusPendingApproval: "承認待ち",
  statusRejected: "拒否",
  startRecruiting: "募集開始",
  publish: "公開する",
  viewPage: "閲覧ページ",
  unpublish: "公開取り消し",
  applyMembership: "参加申請",
  notRecruiting: "参加受付中ではありません",
  readTranslation: "翻訳を読む",
  kick: "除名",

  // コメント
  qaTitleInputPlaceholder: "質問のタイトル（必須）",
  commentPlaceholder: "コメントを入力...",
  submitComment: "投稿する",
  loginToComment: "してコメントする",
  postFailed: "投稿に失敗しました",

  // Q&Aカード
  bestAnswer: "✓ ベストアンサー",
  setBestAnswer: "ベストアンサー",
  unsetBestAnswer: "解除",
  noReplies: "返信はまだありません。",
  replyPlaceholder: "返信を入力...",
  replyBtn: "返信する",
  deletedComment: "このコメントは削除されました",
  repliesCount: (n: number) => `返信 ${n}件`,

  // VerseList
  comment: "コメント",
  bookmark: "お気に入り",
  bookmarkFailed: "お気に入りの操作に失敗しました",

  // ログイン必須モーダル
  loginRequired: "ログインが必要です",
  loginRequiredDesc: "この機能を使うにはログインしてください。",
  loginBtn: "ログインする",

  // 共通 (追加)
  submit: "送信",
  edit: "編集",
  replyShort: "返信",
  report: "報告",
  reported: "報告しました",
  reportedDup: "報告済みです",
  expand: "展開",
  collapse: "折り畳む",
  numReplies: (n: number) => `${n}件の返信`,

  // 章/書/ユーザー not found
  bookNotFound: "書が見つかりません",
  chapterNotFound: "章が見つかりません",
  userNotFound: "ユーザーが見つかりません。",

  // プロフィール（追加）
  selfProfileBefore: "自分のプロフィールは",
  selfProfileLink: "こちら",
  selfProfileAfter: "から確認できます。",
  joinedOn: (dateStr: string) =>
    `${new Date(dateStr).toLocaleDateString("ja-JP")} 登録`,

  // コメント関連の見出し・空状態
  noCommentsYet: "コメントはまだありません",
  bookCommentsHeading: "この書へのコメント",
  chapterCommentsHeading: "章へのコメント",
  verseCommentInput: "この節へのコメント...",

  // ブックマーク
  bookmarkAdd: "お気に入りに追加",
  bookmarkRemove: "お気に入りを解除",
  // お気に入り一覧での種別バッジ
  bookmarkKindVerse: "節",
  bookmarkKindChapter: "章",
  bookmarkKindBook: "書",
  bookmarkKindProject: "翻訳プロジェクト",
  // ページネーション
  paginationLabel: "ページ送り",
  paginationPrev: "前のページ",
  paginationNext: "次のページ",

  // 並び替え・検索
  orderNew: "新しい順",
  orderVotes: "人気順",
  allVersionsToggle: "すべての訳",
  searchComments: "コメントを検索...",

  // Q&A 投稿フォーム
  qaInputTitlePlaceholder: "質問のタイトル（必須）",
  qaInputPlaceholder: "質問の詳細を入力...",
  qaSelectBookOptional: "書を選択（任意）",
  qaSelectChapterOptional: "章を選択（任意）",
  qaSelectVerseOptional: "節を選択（任意）",
  submitQuestion: "質問を投稿する",
  chapterOption: (n: number) => `${n}章`,
  verseOption: (n: number) => `${n}節`,

  // 翻訳プロジェクト
  confirmDeleteProject: "このプロジェクトを削除しますか？この操作は取り消せません。",
  confirmDeleteAllUnits: "すべてのユニットを削除しますか？",
  unitsAdded: (n: number) => `${n} ユニットを追加しました。`,
  unitsDeleted: (n: number) => `${n} ユニットを削除しました。`,
  notPublishedOrMissing: "公開されていないプロジェクトか、存在しないプロジェクトです。",
  backToProjectList: "← プロジェクト一覧に戻る",
  projectFallback: "プロジェクト",
  selectChapterHeading: "章を選択",
  noPublishedVerses: "まだ公開された翻訳節がありません。",
  noPublishedVersesForChapter: "この章に公開された翻訳節がありません。",
  chapterList: "章一覧",
  originalText: "原文:",
  prevChapterFmt: (n: number) => `‹ 第${n}章`,
  nextChapterFmt: (n: number) => `第${n}章 ›`,
  chapterVerseHeader: (c: number, v: number) => `第${c}章 ${v}節`,

  // 通報理由
  reportReasonSpam: "スパム",
  reportReasonOffensive: "不快なコンテンツ",
  reportReasonMisinformation: "誤情報",
  reportReasonOther: "その他",

  // ThemeToggle
  switchToLight: "ライトモードに切り替え",
  switchToDark: "ダークモードに切り替え",

  // ホーム セクション説明
  replyLabel: "返信",

  // 相対時刻 / 日付ロケール
  relJustNow: "たった今",
  relMinutesAgo: (n: number) => `${n}分前`,
  relHoursAgo: (n: number) => `${n}時間前`,
  relDaysAgo: (n: number) => `${n}日前`,
  dateLocale: "ja-JP",

  // 汎用 a11y
  clearInput: "入力をクリア",
  showPassword: "パスワードを表示",
  hidePassword: "パスワードを非表示",
  passwordTooShort: "パスワードは8文字以上で入力してください。",

  // 空状態（EmptyState 用）
  emptyBookmarksDesc: "本文を読んでお気に入りを追加すると、ここに表示されます。",
  emptyBookmarksCta: "読書を始める",
  emptyNotificationsDesc: "あなたへの返信やリアクションがあるとここに表示されます。",
  emptyMyBookmarksDesc: "気になった節やコメントを保存して、後から見返せます。",
  emptyMyCommentsDesc: "本文を読んで気づきをコメントすると、ここに表示されます。",
  emptyQaDesc: "最初の質問を投稿してコミュニティを盛り上げましょう。",
  emptyQaCta: "質問する",
  emptyTranslationsDesc: "翻訳プロジェクトを立ち上げて、共同翻訳を始められます。",
  emptyTranslationsCta: "プロジェクトを作る",
  emptyUnitsDesc: "翻訳する節を追加して、作業を始めましょう。",
  emptyUnitsCta: "節を追加",
  emptyReviewUnitsDesc: "レビュー待ちの節がここに表示されます。",

  // Footer / 信頼性ページ
  footerNavLabel: "サイト全体のリンク",
  footerAbout: "NeON Church について",
  footerTerms: "利用規約",
  footerPrivacy: "プライバシー",
  footerGuidelines: "コミュニティガイドライン",
  footerLicenses: "ライセンス",
  footerFeedback: "フィードバック",
  footerGithub: "GitHub",
  footerBetaNote: "ベータ版運用中。仕様は予告なく変更される場合があります。",

  // プライバシー設定 (UX-7)
  privacyHeading: "プライバシー",
  bookmarksVisibilityLabel: "お気に入りを他のユーザーに公開する",
  bookmarksVisibilityHint: "オフのときは公開プロフィールにお気に入りタブが表示されません。",
  bookmarksVisibilityOn: "公開",
  bookmarksVisibilityOff: "非公開",

  // CommentPanel (UX-9)
  writeCommentCta: "コメントを書く",
  closeCommentPanel: "コメントパネルを閉じる",
  readMoreVerse: "続きを読む",
  readLessVerse: "折りたたむ",

  // 章ナビ / 翻訳切替 (UX-11)
  translationLabel: "翻訳",
  prevChapter: "前の章",
  nextChapter: "次の章",

  // 検索 (UX-14)
  searchKindBook: "書",
  searchKindVerse: "節",
  searchKindComment: "コメント",
  searchEmptyDesc: "別のキーワードを試すか、関連するページを開いて探してみてください。",
  searchEmptyGoQa: "Q&A を見る",
  searchEmptyGoRead: "文献を読む",

  genreNames: { "律法": "律法", "歴史": "歴史", "詩歌": "詩歌", "預言": "預言", "福音書": "福音書", "使徒・書簡": "使徒・書簡", "黙示": "黙示" } as Record<string, string>,
};

const en: typeof ja = {
  loading: "Loading...",
  saving: "Saving...",
  posting: "Posting...",
  cancel: "Cancel",
  close: "Close",
  save: "Save",
  remove: "Remove",
  undo: "Undo",
  prev: "Previous",
  next: "Next",
  all: "All",
  add: "Add",
  delete: "Delete",
  status: "Status",
  approve: "Approve",
  reject: "Reject",
  replies: "replies",
  seeAll: "See all →",
  backToTop: "Back to top",
  chapter: "Chapter",
  verse: "Verse",
  chapterFmt: (n: number) => `Chapter ${n}`,
  verseFmt: (chapter: number, verse: number) => `${chapter}:${verse}`,
  chapterVerseFmt: (book: string, chapter: number, verse: number) => `${book} ${chapter}:${verse} →`,

  menuOpen: "Open menu",
  read: "Read",
  qa: "Q&A",
  translate: "Translate",
  compilation: "Compile",
  bookmarks: "Bookmarks",
  notifications: "Notifications",
  profile: "Profile",
  logout: "Sign out",
  login: "Sign in",
  register: "Sign up",
  searchPlaceholder: "Search...",
  bookSearchLabel: "Search books",
  bookSearchPlaceholder: "Search by title, short name, or English name",
  listSearchEmpty: "No matching books.",
  books: "Books",

  homeTagline: "Not one authority,\nbut an open field.",
  homeDesc: "Toward a Christianity where multiple texts, interpretations, histories, and fragments connect. Read, discuss, and translate every text, without ranking one above another.",
  todayVerse: "Today's Verse",
  verseUnavailable: "Verse unavailable today.",
  trending: "Trending",
  recentQA: "Recent Q&A",
  aboutLink: "About NeON Church",
  compilationLoginTitle: "Sign in to compile",
  compilationLoginDesc: "Sign in to gather verses and prose into your own book.",

  readTitle: "Read the Bible",
  resumeReading: (bookName: string, chapter: number) => `Resume — ${bookName} Ch.${chapter} ›`,
  selectBook: "Select a book",
  totalChapters: (n: number) => `${n} chapters`,
  myTranslationsHeading: "Bookshelf",
  addToLibrary: "Add to bookshelf",
  removeFromLibrary: "Remove from bookshelf",

  bookList: "Book list",
  toComments: "Go to chapter comments ↓",
  markShorterEnding: "Shorter Ending",
  switchTranslation: (label: string) => `Switch to ${label}`,
  translationNotFound: (name: string) => `"${name}" not found. Please switch to another translation.`,

  bookmarksTitle: "Bookmarks",
  noBookmarks: "No bookmarks yet.",
  commentBy: (username: string) => `Comment by ${username}`,

  notificationsTitle: "Notifications",
  markAllRead: "Mark all read",
  noNotifications: "No notifications.",
  notifReply: "Reply",
  notifUpvote: "Like",

  qaTitle: "Q&A",
  askQuestion: "Ask a question",
  qaDesc: "A list of questions and discussions about the Bible.",
  qaFilters: "Filters",
  qaSearchLabel: "Search questions",
  qaSearchPlaceholder: "Search questions",
  qaQuestionCount: (n: number) => `${n} ${n === 1 ? "question" : "questions"}`,
  qaEmpty: "No Q&A posts yet.",
  filterAll: "All",
  filterUnanswered: "Unanswered",
  filterAnswered: "Answered",
  answerQuestion: "Answer",
  qaColAnsweredDesc: "Questions with a chosen best answer",
  qaColUnansweredDesc: "Questions that are not resolved yet",
  qaEmptyColumn: "No questions in this state",
  allBooks: "All books",
  allVersions: "All versions",
  allTags: "All tags",
  tagNames: {
    "感想": "Reflection",
    "解説": "Commentary",
    "証し": "Testimony",
    "祈り": "Prayer",
    "考察": "Analysis",
  } as Record<string, string>,

  searchTitle: "Search",
  searchKeyword: "Enter keywords...",
  searchMinChars: "Please enter at least 2 characters.",
  searching: "Searching...",
  searchResults: (q: string, n: number) => `Results for "${q}": ${n} found`,
  searchEmpty: (q: string) => `No results found for "${q}".`,
  sectionBooks: "Books",
  sectionVerses: "Verses",
  sectionComments: "Comments (up to 20)",
  searchLoadMore: (n: number) => `Show more (${n} remaining)`,
  readLink: "Read →",

  loginTitle: "Sign In",
  username: "Username",
  password: "Password",
  loggingIn: "Signing in...",
  loginFailed: "Sign in failed",
  noAccount: "Don't have an account?",
  oauthOr: "or",
  oauthGoogle: "Sign in with Google",
  oauthGithub: "Sign in with GitHub",
  oauthError: "Social login failed. Please try again.",
  sessionExpiredTitle: "Your session has expired",
  sessionExpiredDesc: "Please sign in again.",

  registerTitle: "Sign Up",
  email: "Email",
  passwordHint: "Password (8+ characters)",
  registering: "Signing up...",
  registerBtn: "Sign up",
  registerFailed: "Sign up failed",
  hasAccount: "Already have an account?",

  profileTitle: "Profile",
  joinedDate: "Joined",
  bio: "Bio",
  bioPlaceholder: "Tell us about yourself",
  profileUpdated: "Profile updated.",
  profileUpdateFailed: "Update failed. Please try again.",
  tabBookmarks: "Bookmarks",
  tabComments: "Comments",
  noMyBookmarks: "No bookmarks yet.",
  noMyComments: "No comments yet.",

  aboutTitle: "About NeON Church",
  aboutSubtitle: "A new Christian platform where texts and interpretations intersect",
  aboutSection1Title: "Concept",
  aboutSection1Body: "What does it mean for Christianity to be “Japanese”?\n\nAs I reflected on this question, I found my way to Kanzo Uchimura’s idea of Non-Church Christianity.\n\nAt the same time, I have long been interested in postmodern thought, and through the influence of Hiroki Azuma’s Otaku: Japan’s Database Animals, I began to imagine what might be called a database-like Christianity. Rather than understanding Christianity as a single fixed institution or authority, could it instead be seen as an open field where multiple texts, interpretations, histories, and fragments are connected?\n\nNeON Church was born from this question.\n\nThrough this project, I hope to discover new points of contact between conservative Christianity and thought after postmodernism. I also hope to shed light on texts that were placed outside the canon throughout history, as well as interpretations that have been marginalized.\n\nThe name NeON comes from neon, the name of the chemical element derived from the Greek word neos, meaning “new.” And at the same time, as its capital letters N-O-N reveal, it also comes from the “Non” of the Non-Church Christianity mentioned at the outset. “Newness” and “Non-Church” — the name carries both meanings at once. It also resonates, as suggested by the background image, with the neon-lit streets of Tokyo: their hybridity, artificiality, chaos, and sense of newness.\n\nNeON Church is not a church as an institution, but a new Christian platform where texts and interpretations intersect.",
  aboutSection2Title: "Features",
  aboutFeatures: [
    "Comment on any verse, chapter, or book in the collection",
    "Q&A — post questions and mark the best answer",
    "Full-text search across verses, comments, and book titles",
    "Bookmark comments and verses",
    "Auto-save reading progress (resume where you left off)",
    "Vote on comments (upvote) and receive notifications",
    "Collaborative translation projects — translate the Bible as a team",
  ],
  aboutSection3Title: "Coming soon",
  aboutPlanned: ["More texts", "Side-by-side translation view", "Profile photos"],
  backToHome: "← Back to home",

  translationsTitle: "Translation Projects",
  translationsDesc: "Collaborative Bible translation projects",
  projectSearchLabel: "Search projects",
  projectSearchPlaceholder: "Search by project, description, or book",
  newProject: "+ New project",
  colDraftLabel: "Draft",
  colPublishedDesc: "Projects that are published and released",
  colActiveDesc: "Projects currently in progress",
  colDraftDesc: "Projects in early planning or draft",
  emptyColumn: "No projects with this status",
  noProjects: "No public projects yet.",
  createFirst: "Create the first project →",
  statusActive: "Active",
  statusPublished: "Published",
  createdBy: "By:",
  progress: "Progress:",
  translationLanguage: "Language:",

  newTranslationTitle: "New Translation Project",
  backToTranslations: "← Translation projects",
  projectName: "Project name *",
  projectNamePlaceholder: "e.g. Matthew English Translation",
  description: "Description",
  descPlaceholder: "Purpose and guidelines (optional)",
  bibleVersion: "Bible version *",
  sourceBook: "Source book *",
  selectBookOption: "Select a book...",
  targetLanguage: "Target language *",
  selectLangOption: "Select a language...",
  creating: "Creating...",
  createProject: "Create project",
  createFailed: "Failed to create. Please try again.",
  createMissingFields: "Please fill in the project name, source book, and target language.",

  missingFields: (fields: string[]) => `Please fill in: ${fields.join(", ")}.`,
  fieldTitle: "Title",
  fieldBody: "Body",
  fieldChapter: "Chapter",

  units: "Units",
  review: "Review",
  members: "Members",
  addAllChapters: "Add all chapters",
  adding: "Adding…",
  deleteAllUnits: "Delete all units",
  deleting: "Deleting…",
  addUnit: "+ Add unit",
  selectChapter: "Select chapter",
  addAllVerses: "Add all verses",
  noUnitsMsg: "Please add units.",
  noUnits: "No units yet.",
  backToChapters: "Back to chapters",
  assignee: "Assignee:",
  statusPending: "Pending",
  statusInProgress: "In progress",
  statusInReview: "In review",
  statusDone: "Done",
  noAssignee: "Unassigned",
  assigneeLabel: "Assignee",
  statusFieldLabel: "Status",
  sourceText: "Source",
  translationText: "Translation",
  translationPlaceholder: "Enter your translation…",
  notTranslatedYet: "Not translated yet",
  editTranslation: "Edit translation",
  sendBack: "Send back",
  closeDiscussion: "▲ Close discussion",
  openDiscussion: "▼ View discussion",
  mentionPlaceholder: "@mention. Shift+Enter for newline...",
  sendComment: "Send",
  noReviewUnits: "No units in review.",
  openReviewTarget: "Go to unit",
  confirmApproveTitle: "Approve this translation?",
  confirmApproveDesc: "Approving sets this unit's status to Done.",
  membersOnly: "Visible to members only.",
  roleOwner: "Owner",
  roleMember: "Member",
  statusApproved: "Approved",
  statusPendingApproval: "Pending",
  statusRejected: "Rejected",
  startRecruiting: "Start recruiting",
  publish: "Publish",
  viewPage: "View page",
  unpublish: "Unpublish",
  applyMembership: "Apply",
  notRecruiting: "Not accepting applications",
  readTranslation: "Read translation",
  kick: "Remove",

  qaTitleInputPlaceholder: "Question title (required)",
  commentPlaceholder: "Write a comment...",
  submitComment: "Post",
  loginToComment: "to comment",
  postFailed: "Failed to post",

  bestAnswer: "✓ Best answer",
  setBestAnswer: "Best answer",
  unsetBestAnswer: "Unset",
  noReplies: "No replies yet.",
  replyPlaceholder: "Write a reply...",
  replyBtn: "Reply",
  deletedComment: "This comment has been deleted",
  repliesCount: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,

  comment: "Comment",
  bookmark: "Bookmark",
  bookmarkFailed: "Failed to update bookmark",

  loginRequired: "Login required",
  loginRequiredDesc: "Please sign in to use this feature.",
  loginBtn: "Sign in",

  submit: "Submit",
  edit: "Edit",
  replyShort: "Reply",
  report: "Report",
  reported: "Reported",
  reportedDup: "Already reported",
  expand: "Expand",
  collapse: "Collapse",
  numReplies: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,

  bookNotFound: "Book not found",
  chapterNotFound: "Chapter not found",
  userNotFound: "User not found.",

  selfProfileBefore: "Your own profile is available",
  selfProfileLink: "here",
  selfProfileAfter: ".",
  joinedOn: (dateStr: string) =>
    `Joined ${new Date(dateStr).toLocaleDateString("en-US")}`,

  noCommentsYet: "No comments yet",
  bookCommentsHeading: "Comments on this book",
  chapterCommentsHeading: "Chapter comments",
  verseCommentInput: "Comment on this verse...",

  bookmarkAdd: "Add bookmark",
  bookmarkRemove: "Remove bookmark",
  bookmarkKindVerse: "Verse",
  bookmarkKindChapter: "Chapter",
  bookmarkKindBook: "Book",
  bookmarkKindProject: "Translation project",
  paginationLabel: "Pagination",
  paginationPrev: "Previous page",
  paginationNext: "Next page",

  orderNew: "Newest",
  orderVotes: "Popular",
  allVersionsToggle: "All versions",
  searchComments: "Search comments...",

  qaInputTitlePlaceholder: "Question title (required)",
  qaInputPlaceholder: "Describe your question in detail...",
  qaSelectBookOptional: "Select a book (optional)",
  qaSelectChapterOptional: "Select a chapter (optional)",
  qaSelectVerseOptional: "Select a verse (optional)",
  submitQuestion: "Post question",
  chapterOption: (n: number) => `Chapter ${n}`,
  verseOption: (n: number) => `Verse ${n}`,

  confirmDeleteProject: "Delete this project? This action cannot be undone.",
  confirmDeleteAllUnits: "Delete all units?",
  unitsAdded: (n: number) => `Added ${n} units.`,
  unitsDeleted: (n: number) => `Deleted ${n} units.`,
  notPublishedOrMissing: "This project is not published or does not exist.",
  backToProjectList: "← Back to project list",
  projectFallback: "Project",
  selectChapterHeading: "Select chapter",
  noPublishedVerses: "No translated verses published yet.",
  noPublishedVersesForChapter: "No translated verses for this chapter.",
  chapterList: "Chapter list",
  originalText: "Original:",
  prevChapterFmt: (n: number) => `‹ Chapter ${n}`,
  nextChapterFmt: (n: number) => `Chapter ${n} ›`,
  chapterVerseHeader: (c: number, v: number) => `Chapter ${c} v.${v}`,

  reportReasonSpam: "Spam",
  reportReasonOffensive: "Offensive content",
  reportReasonMisinformation: "Misinformation",
  reportReasonOther: "Other",

  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",

  replyLabel: "replies",

  relJustNow: "Just now",
  relMinutesAgo: (n: number) => `${n}m ago`,
  relHoursAgo: (n: number) => `${n}h ago`,
  relDaysAgo: (n: number) => `${n}d ago`,
  dateLocale: "en-US",

  clearInput: "Clear input",
  showPassword: "Show password",
  hidePassword: "Hide password",
  passwordTooShort: "Password must be at least 8 characters.",

  emptyBookmarksDesc: "Read passages and save your favorites — they'll show up here.",
  emptyBookmarksCta: "Start reading",
  emptyNotificationsDesc: "Replies and reactions to you will appear here.",
  emptyMyBookmarksDesc: "Save verses and comments to revisit them later.",
  emptyMyCommentsDesc: "Share your thoughts on a passage and they'll show up here.",
  emptyQaDesc: "Post the first question to get the community started.",
  emptyQaCta: "Ask a question",
  emptyTranslationsDesc: "Create a project to begin collaborative translation.",
  emptyTranslationsCta: "Create a project",
  emptyUnitsDesc: "Add verses to translate and get started.",
  emptyUnitsCta: "Add a unit",
  emptyReviewUnitsDesc: "Units awaiting review will appear here.",

  footerNavLabel: "Site links",
  footerAbout: "About NeON Church",
  footerTerms: "Terms of Service",
  footerPrivacy: "Privacy Policy",
  footerGuidelines: "Community Guidelines",
  footerLicenses: "Licenses",
  footerFeedback: "Feedback",
  footerGithub: "GitHub",
  footerBetaNote: "This service is in beta. Specifications may change without notice.",

  privacyHeading: "Privacy",
  bookmarksVisibilityLabel: "Show my bookmarks on my public profile",
  bookmarksVisibilityHint: "When off, the bookmarks tab won't appear on your public profile.",
  bookmarksVisibilityOn: "Public",
  bookmarksVisibilityOff: "Private",

  writeCommentCta: "Write a comment",
  closeCommentPanel: "Close comment panel",
  readMoreVerse: "Read more",
  readLessVerse: "Show less",

  translationLabel: "Translation",
  prevChapter: "Previous chapter",
  nextChapter: "Next chapter",

  searchKindBook: "Book",
  searchKindVerse: "Verse",
  searchKindComment: "Comment",
  searchEmptyDesc: "Try different keywords or browse related pages.",
  searchEmptyGoQa: "Browse Q&A",
  searchEmptyGoRead: "Browse texts",

  genreNames: { "律法": "Law (Torah)", "歴史": "History", "詩歌": "Poetry & Wisdom", "預言": "Prophets", "福音書": "Gospels", "使徒・書簡": "Acts & Epistles", "黙示": "Apocalyptic" } as Record<string, string>,
};

export type Translations = typeof ja;

export const translations: Record<string, Translations> = { ja, en };

export function useT(): Translations {
  const { lang } = useLang();
  return translations[lang] ?? translations.ja;
}

export function useBookLabel(slug: string): { name: string; short: string } | null {
  const { lang } = useLang();
  const b = getBookBySlug(slug);
  if (!b) return null;
  return lang === "en"
    ? { name: b.englishName, short: b.englishName }
    : { name: b.name, short: b.short };
}

export function bookLabel(slug: string, lang: string): { name: string; short: string } | null {
  const b = getBookBySlug(slug);
  if (!b) return null;
  return lang === "en"
    ? { name: b.englishName, short: b.englishName }
    : { name: b.name, short: b.short };
}

// 箇所（slug/章/節）を表示言語の書名でラベル化する（例: "マタイ 1章1節"）。
// バックエンドの location_label は投稿時訳の書名（ギリシャ語名など）で出るため、
// 表示側ではこのヘルパーで UI 言語の書名に揃える。
export function formatBookLocation(
  slug: string,
  chapter: number | null,
  verse: number | null,
  lang: string,
): string {
  const t = translations[lang] ?? translations.ja;
  const name = bookLabel(slug, lang)?.name ?? slug;
  if (chapter != null && verse != null) return `${name} ${t.verseFmt(chapter, verse)}`;
  if (chapter != null) return `${name} ${t.chapterFmt(chapter)}`;
  return name;
}

// 全訳の一覧（翻訳プロジェクトの元訳選択など、本に依らない場面で使う）。
export function useTranslationOptions(): { id: string; label: string }[] {
  const { lang } = useLang();
  return BIBLE_TRANSLATIONS.map((tr) => ({ id: tr.id, label: translationLabel(tr.id, lang) }));
}

export function useRelativeTime(): (dateStr: string) => string {
  const t = useT();
  return (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return t.relJustNow;
    if (diff < 3600) return t.relMinutesAgo(Math.floor(diff / 60));
    if (diff < 86400) return t.relHoursAgo(Math.floor(diff / 3600));
    if (diff < 86400 * 30) return t.relDaysAgo(Math.floor(diff / 86400));
    return new Date(dateStr).toLocaleDateString(t.dateLocale);
  };
}
