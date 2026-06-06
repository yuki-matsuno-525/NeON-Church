"use client"

import React, { useState } from "react"

type Theme = "A" | "B" | "C"
type Mode = "light" | "dark"
type Layout = "sidebar" | "full"
type Screen = "reading" | "bookmarks" | "notifications" | "login"

// ----------------------------------------------------------------
// サンプルデータ
// ----------------------------------------------------------------
const VERSES = [
  { number: 1, text: "アブラハムの子であるダビデの子、イエス・キリストの系図。" },
  { number: 2, text: "アブラハムはイサクをもうけ、イサクはヤコブをもうけ、ヤコブはユダとその兄弟たちをもうけ、" },
  { number: 3, text: "ユダはタマルによってパレスとザラとをもうけ、パレスはエスロムをもうけ、エスロムはアラムをもうけ、" },
  { number: 4, text: "アラムはアミナダブをもうけ、アミナダブはナアソンをもうけ、ナアソンはサルモンをもうけ、" },
  { number: 5, text: "サルモンはラハブによってボアズをもうけ、ボアズはルツによってオベデをもうけ、オベデはエッサイをもうけ、" },
  { number: 6, text: "エッサイはダビデ王をもうけた。ダビデはウリヤの妻によってソロモンをもうけ、" },
  { number: 7, text: "ソロモンはレハベアムをもうけ、レハベアムはアビヤをもうけ、アビヤはアサをもうけ、" },
  { number: 8, text: "アサはヨサファテをもうけ、ヨサファテはヨラムをもうけ、ヨラムはウジヤをもうけ、" },
]

const BOOKS = [
  { name: "マタイ", chapters: 7 },
  { name: "マルコ", chapters: 5 },
  { name: "ルカ", chapters: 6 },
  { name: "ヨハネ", chapters: 5 },
]

const COMMENTS_DATA = [
  {
    id: 1,
    user: "田中太郎",
    body: "この系図は神の約束の成就を示しています。アブラハムとダビデへの約束が一つのラインで繋がっています。",
    votes: 12,
    time: "2時間前",
    replies: [
      { id: 2, user: "佐藤花子", body: "そうですね。特に異邦人の女性（ラハブ、ルツ）が含まれているのが印象的です。", votes: 5, time: "1時間前" },
    ],
  },
  {
    id: 3,
    user: "鈴木一郎",
    body: "14世代×3のパターンは記憶のための整理であり、神学的メッセージを優先しているのかもしれません。",
    votes: 8,
    time: "3時間前",
    replies: [],
  },
]

const BOOKMARKS_DATA = [
  { book: "マタイ", chapter: 5, verse: 3, text: "心の貧しい人たちは、さいわいである、天国はその人たちのものである。" },
  { book: "ヨハネ", chapter: 3, verse: 16, text: "神はそのひとり子を賜わったほどに、この世を愛して下さった。" },
  { book: "マルコ", chapter: 12, verse: 30, text: "心をつくし、精神をつくし、思いをつくし、力をつくして、主なるあなたの神を愛せよ。" },
]

const NOTIFICATIONS_DATA = [
  { id: 1, type: "reply", actor: "佐藤花子", text: "あなたのコメントに返信しました", time: "1時間前", read: false },
  { id: 2, type: "upvote", actor: "山田次郎", text: "あなたのコメントに投票しました", time: "3時間前", read: false },
  { id: 3, type: "reply", actor: "鈴木一郎", text: "あなたのコメントに返信しました", time: "昨日", read: true },
]

// ----------------------------------------------------------------
// パレット定義
// ----------------------------------------------------------------
type Palette = {
  bg: string; bgAlt: string; bgHover: string; border: string
  text: string; textMuted: string; textFaint: string
  accent: string; accentText: string
  bibleFont: string; bibleFontSize: string; bibleLineHeight: string
  radius: string; radiusSm: string
}

function getPalette(theme: Theme, mode: Mode): Palette {
  const base: Pick<Palette, "radius" | "radiusSm"> = {
    radius: theme === "C" ? "3px" : theme === "B" ? "4px" : "8px",
    radiusSm: theme === "C" ? "2px" : "5px",
  }
  const fonts = {
    bibleFont: theme === "B" ? "Georgia, 'Times New Roman', serif" : "ui-sans-serif, system-ui, sans-serif",
    bibleFontSize: theme === "B" ? "1.1875rem" : theme === "C" ? "0.9375rem" : "1.125rem",
    bibleLineHeight: theme === "B" ? "2.2" : "1.85",
  }

  if (theme === "A" && mode === "light")
    return { ...base, ...fonts, bg: "#ffffff", bgAlt: "#f9fafb", bgHover: "#f3f4f6", border: "#e5e7eb", text: "#111827", textMuted: "#6b7280", textFaint: "#9ca3af", accent: "#2563eb", accentText: "#ffffff" }
  if (theme === "A" && mode === "dark")
    return { ...base, ...fonts, bg: "#09090b", bgAlt: "#18181b", bgHover: "#27272a", border: "#3f3f46", text: "#fafafa", textMuted: "#a1a1aa", textFaint: "#71717a", accent: "#60a5fa", accentText: "#09090b" }
  if (theme === "B" && mode === "light")
    return { ...base, ...fonts, bg: "#fdf8f0", bgAlt: "#f5ede0", bgHover: "#ede0cc", border: "#c9a97a", text: "#2c1a0e", textMuted: "#7a5c3e", textFaint: "#b09070", accent: "#92400e", accentText: "#fdf8f0" }
  if (theme === "B" && mode === "dark")
    return { ...base, ...fonts, bg: "#100c07", bgAlt: "#1c140a", bgHover: "#2a1f10", border: "#3d2b15", text: "#f0dcc0", textMuted: "#a08060", textFaint: "#6b5040", accent: "#d97706", accentText: "#100c07" }
  if (theme === "C" && mode === "light")
    return { ...base, ...fonts, bg: "#dae0e6", bgAlt: "#ffffff", bgHover: "#f6f7f8", border: "#cccccc", text: "#1c1c1c", textMuted: "#828282", textFaint: "#aaaaaa", accent: "#ff4500", accentText: "#ffffff" }
  // C dark
  return { ...base, ...fonts, bg: "#1a1a1b", bgAlt: "#272729", bgHover: "#313131", border: "#474748", text: "#d7dadc", textMuted: "#818384", textFaint: "#606060", accent: "#ff4500", accentText: "#ffffff" }
}

// ----------------------------------------------------------------
// 共通スタイルヘルパー
// ----------------------------------------------------------------
function btn(p: Palette, active = false) {
  return {
    padding: "8px 20px",
    backgroundColor: active ? p.accent : p.bgAlt,
    color: active ? p.accentText : p.text,
    border: `1px solid ${active ? p.accent : p.border}`,
    borderRadius: p.radius,
    cursor: "pointer" as const,
    fontWeight: active ? 700 : 400,
    fontSize: "0.875rem",
  }
}

// ----------------------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------------------
export default function DemoPage() {
  const [theme, setTheme] = useState<Theme>("A")
  const [mode, setMode] = useState<Mode>("light")
  const [layout, setLayout] = useState<Layout>("sidebar")
  const [screen, setScreen] = useState<Screen>("reading")
  const [activeBook, setActiveBook] = useState("マタイ")
  const [activeChapter, setActiveChapter] = useState(1)
  const [expandedBook, setExpandedBook] = useState("マタイ")
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [commentInput, setCommentInput] = useState("")

  const p = getPalette(theme, mode)

  // --- デモコントロールバー（常にダーク固定）---
  const ctrlBar = (
    <div style={{
      position: "sticky" as const, top: 0, zIndex: 100,
      background: "#1e1e2e", color: "#cdd6f4",
      padding: "8px 20px", display: "flex", flexWrap: "wrap" as const,
      gap: "20px", alignItems: "center", fontSize: "0.75rem",
      boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
    }}>
      <span style={{ fontWeight: 800, color: "#89b4fa", letterSpacing: "0.05em" }}>DEMO</span>

      {[
        {
          label: "トーン",
          items: [
            { value: "A", label: "A ミニマル", color: "#89b4fa" },
            { value: "B", label: "B クラシック", color: "#f9e2af" },
            { value: "C", label: "C ソーシャル", color: "#f38ba8" },
          ] as { value: Theme; label: string; color: string }[],
          current: theme,
          set: (v: string) => setTheme(v as Theme),
        },
        {
          label: "モード",
          items: [
            { value: "light", label: "☀ ライト", color: "#a6e3a1" },
            { value: "dark", label: "🌙 ダーク", color: "#cba6f7" },
          ] as { value: Mode; label: string; color: string }[],
          current: mode,
          set: (v: string) => setMode(v as Mode),
        },
        {
          label: "レイアウト",
          items: [
            { value: "sidebar", label: "▣ サイドバー", color: "#94e2d5" },
            { value: "full", label: "▤ フルワイド", color: "#94e2d5" },
          ] as { value: Layout; label: string; color: string }[],
          current: layout,
          set: (v: string) => setLayout(v as Layout),
        },
        {
          label: "画面",
          items: [
            { value: "reading", label: "📖 読書", color: "#fab387" },
            { value: "bookmarks", label: "🔖 お気に入り", color: "#fab387" },
            { value: "notifications", label: "🔔 通知", color: "#fab387" },
            { value: "login", label: "🔑 ログイン", color: "#fab387" },
          ] as { value: Screen; label: string; color: string }[],
          current: screen,
          set: (v: string) => setScreen(v as Screen),
        },
      ].map(group => (
        <div key={group.label} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <span style={{ color: "#585b70", marginRight: "2px" }}>{group.label}:</span>
          {group.items.map(item => (
            <button
              key={item.value}
              onClick={() => group.set(item.value)}
              style={{
                padding: "2px 10px", borderRadius: "4px", border: "none",
                cursor: "pointer", fontSize: "0.75rem",
                background: group.current === item.value ? item.color : "#313244",
                color: group.current === item.value ? "#1e1e2e" : "#cdd6f4",
                fontWeight: group.current === item.value ? 700 : 400,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )

  // --- ナビゲーションバー ---
  const navbar = (
    <header style={{
      backgroundColor: p.bgAlt,
      borderBottom: `1px solid ${p.border}`,
      padding: "0 24px",
      height: "56px",
      display: "flex", alignItems: "center", gap: "16px",
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: theme === "B" ? "Georgia, serif" : "system-ui, sans-serif",
        fontWeight: 800, fontSize: "1.25rem", color: p.accent,
        letterSpacing: theme === "B" ? "0.06em" : "-0.01em",
      }}>
        {theme === "B" ? "✝ NeON Church" : "NeON Church"}
      </div>
      <div style={{ flex: 1 }} />
      {screen !== "login" && (
        <>
          <button onClick={() => setScreen("bookmarks")}
            style={{ background: "none", border: "none", cursor: "pointer", color: screen === "bookmarks" ? p.accent : p.textMuted, fontSize: "0.875rem", fontWeight: screen === "bookmarks" ? 700 : 400 }}>
            お気に入り
          </button>
          <button onClick={() => setScreen("notifications")}
            style={{ background: "none", border: "none", cursor: "pointer", position: "relative" as const }}>
            <span style={{ fontSize: "1.125rem" }}>🔔</span>
            <span style={{
              position: "absolute" as const, top: -3, right: -3,
              background: "#ef4444", color: "#fff",
              borderRadius: "50%", width: "14px", height: "14px",
              fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "system-ui",
            }}>2</span>
          </button>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: p.accent, color: p.accentText,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
          }}>田</div>
        </>
      )}
      {screen === "login" && (
        <button onClick={() => setScreen("reading")} style={btn(p, true)}>ログイン</button>
      )}
    </header>
  )

  // --- サイドバー ---
  const sidebar = (
    <aside style={{
      width: "200px", minWidth: "200px",
      background: p.bgAlt,
      borderRight: `1px solid ${p.border}`,
      padding: "12px 0",
      overflowY: "auto" as const,
      flexShrink: 0,
    }}>
      {theme === "B" && (
        <div style={{ padding: "0 16px 12px", borderBottom: `1px solid ${p.border}`, marginBottom: "8px" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "0.6875rem", letterSpacing: "0.12em", color: p.textFaint, textTransform: "uppercase" as const }}>
            福音書
          </div>
        </div>
      )}
      {BOOKS.map(book => (
        <div key={book.name}>
          <button
            onClick={() => setExpandedBook(expandedBook === book.name ? "" : book.name)}
            style={{
              width: "100%", textAlign: "left" as const,
              padding: "8px 16px",
              background: activeBook === book.name && screen === "reading" ? p.bgHover : "none",
              border: "none", cursor: "pointer",
              color: activeBook === book.name && screen === "reading" ? p.accent : p.text,
              fontWeight: activeBook === book.name && screen === "reading" ? 700 : 400,
              fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
              fontSize: "0.9375rem",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            {book.name}
            <span style={{ color: p.textFaint, fontSize: "0.75rem" }}>
              {expandedBook === book.name ? "▾" : "▸"}
            </span>
          </button>
          {expandedBook === book.name && (
            <div style={{ paddingLeft: "8px", paddingBottom: "4px" }}>
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => (
                <button
                  key={ch}
                  onClick={() => { setActiveBook(book.name); setActiveChapter(ch); setScreen("reading") }}
                  style={{
                    display: "block", width: "100%", textAlign: "left" as const,
                    padding: "4px 16px",
                    background: activeBook === book.name && activeChapter === ch && screen === "reading"
                      ? p.accent : "none",
                    border: "none", cursor: "pointer",
                    fontSize: "0.8125rem",
                    color: activeBook === book.name && activeChapter === ch && screen === "reading"
                      ? p.accentText : p.textMuted,
                    fontWeight: activeBook === book.name && activeChapter === ch && screen === "reading" ? 600 : 400,
                    borderRadius: p.radiusSm,
                  }}
                >
                  第{ch}章
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  )

  // --- 読書画面 ---
  const readingScreen = (
    <div style={{
      maxWidth: layout === "full" ? "740px" : "100%",
      margin: layout === "full" ? "0 auto" : "0",
      padding: "32px 28px",
    }}>
      {/* パンくず */}
      <div style={{ fontFamily: "system-ui", fontSize: "0.8125rem", color: p.textMuted, marginBottom: "6px" }}>
        {activeBook} &rsaquo; 第{activeChapter}章
      </div>

      {/* 章タイトル */}
      <h1 style={{
        fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
        fontSize: theme === "B" ? "2rem" : "1.5rem",
        fontWeight: 700, color: p.text,
        marginBottom: theme === "B" ? "4px" : "28px",
        lineHeight: 1.25,
        letterSpacing: theme === "B" ? "0.02em" : "-0.01em",
      }}>
        {activeBook} 第{activeChapter}章
      </h1>
      {theme === "B" && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "0.875rem", fontStyle: "italic", color: p.textMuted }}>
            口語訳（1954年）
          </div>
          <div style={{ marginTop: "10px", width: "60px", borderBottom: `2px solid ${p.border}` }} />
        </div>
      )}

      {/* 聖書本文 */}
      <div style={{ marginBottom: "48px" }}>
        {VERSES.map(verse => {
          const isSelected = selectedVerse === verse.number
          const verseBg = isSelected
            ? theme === "A" ? (mode === "dark" ? "#1e3a5f" : "#eff6ff")
            : theme === "B" ? (mode === "dark" ? "#2a1f10" : "#fef9ee")
            : (mode === "dark" ? "#313131" : "#f6f7f8")
            : (theme === "C" ? p.bgAlt : "transparent")
          return (
            <div
              key={verse.number}
              onClick={() => setSelectedVerse(isSelected ? null : verse.number)}
              style={{
                padding: theme === "C" ? "10px 14px" : "8px 0",
                marginBottom: theme === "C" ? "3px" : "0",
                borderRadius: p.radiusSm,
                background: verseBg,
                borderLeft: isSelected ? `3px solid ${p.accent}` : theme === "C" ? "3px solid transparent" : "none",
                paddingLeft: isSelected || theme === "C" ? "14px" : "0",
                cursor: "pointer",
                transition: "background 0.12s, padding-left 0.12s",
              }}
            >
              <span style={{
                fontFamily: "system-ui, sans-serif",
                color: p.accent, fontWeight: 700,
                fontSize: theme === "B" ? "0.75rem" : "0.6875rem",
                marginRight: "6px",
                userSelect: "none" as const,
              }}>
                {verse.number}
              </span>
              <span style={{
                fontFamily: p.bibleFont,
                fontSize: p.bibleFontSize,
                lineHeight: p.bibleLineHeight,
                color: p.text,
              }}>
                {verse.text}
              </span>
              {isSelected && (
                <div style={{ marginTop: "8px", display: "flex", gap: "8px", fontFamily: "system-ui" }}>
                  <button style={{
                    ...btn(p, true),
                    padding: "4px 12px", fontSize: "0.8125rem",
                  }}>💬 コメント</button>
                  <button style={{
                    ...btn(p),
                    padding: "4px 12px", fontSize: "0.8125rem",
                  }}>🔖 お気に入り</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* コメントセクション */}
      <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: "32px" }}>
        <h2 style={{
          fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
          fontSize: "1.125rem", fontWeight: 700,
          color: p.text, marginBottom: "20px",
        }}>
          コメント ({COMMENTS_DATA.length})
        </h2>

        {/* コメント入力 */}
        <div style={{ marginBottom: "28px" }}>
          <textarea
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            placeholder="この章についてコメントを書く…"
            style={{
              width: "100%", padding: "12px",
              background: p.bgAlt, color: p.text,
              border: `1px solid ${p.border}`, borderRadius: p.radius,
              fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
              fontSize: "0.9375rem",
              resize: "vertical" as const, minHeight: "80px",
              boxSizing: "border-box" as const, outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" as const, marginTop: "8px" }}>
            <button style={{
              ...btn(p, !!commentInput),
              opacity: commentInput ? 1 : 0.5,
            }}>投稿する</button>
          </div>
        </div>

        {/* コメント一覧 */}
        {COMMENTS_DATA.map(comment => (
          <div key={comment.id} style={{
            marginBottom: "24px",
            paddingBottom: "24px",
            borderBottom: `1px solid ${p.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontFamily: "system-ui" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: p.accent, color: p.accentText,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
              }}>{comment.user[0]}</div>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: p.text }}>{comment.user}</span>
              <span style={{ color: p.textFaint, fontSize: "0.75rem" }}>{comment.time}</span>
            </div>
            <p style={{
              margin: "0 0 10px 0",
              fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
              fontSize: "0.9375rem", lineHeight: "1.7", color: p.text,
            }}>{comment.body}</p>
            <div style={{ display: "flex", gap: "14px", fontFamily: "system-ui", fontSize: "0.8125rem", color: p.textMuted }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: p.textMuted, display: "flex", alignItems: "center", gap: "4px" }}>
                ▲ <span style={{ color: p.text, fontWeight: 600 }}>{comment.votes}</span>
              </button>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: p.textMuted }}>返信</button>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: p.textFaint, fontSize: "0.75rem" }}>通報</button>
            </div>
            {comment.replies.map(reply => (
              <div key={reply.id} style={{
                marginTop: "14px", marginLeft: "20px",
                paddingLeft: "14px",
                borderLeft: `2px solid ${p.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontFamily: "system-ui" }}>
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: p.bgHover, color: p.textMuted,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6875rem", fontWeight: 700, flexShrink: 0,
                  }}>{reply.user[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: p.text }}>{reply.user}</span>
                  <span style={{ color: p.textFaint, fontSize: "0.75rem" }}>{reply.time}</span>
                </div>
                <p style={{
                  margin: "0 0 8px 0",
                  fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
                  fontSize: "0.875rem", lineHeight: "1.65", color: p.text,
                }}>{reply.body}</p>
                <div style={{ display: "flex", gap: "12px", fontFamily: "system-ui", fontSize: "0.75rem", color: p.textMuted }}>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: p.textMuted }}>▲ {reply.votes}</button>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: p.textMuted }}>返信</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  // --- ブックマーク画面 ---
  const bookmarksScreen = (
    <div style={{
      maxWidth: layout === "full" ? "740px" : "100%",
      margin: layout === "full" ? "0 auto" : "0",
      padding: "32px 28px",
    }}>
      <h1 style={{
        fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
        fontSize: "1.5rem", fontWeight: 700, color: p.text, marginBottom: "24px",
      }}>お気に入り</h1>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
        {BOOKMARKS_DATA.map((bm, i) => (
          <div key={i} onClick={() => setScreen("reading")} style={{
            padding: "16px 18px",
            background: p.bgAlt,
            border: `1px solid ${p.border}`,
            borderRadius: p.radius,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}>
            <div style={{ fontFamily: "system-ui", fontSize: "0.8125rem", color: p.accent, fontWeight: 700, marginBottom: "6px" }}>
              {bm.book} {bm.chapter}:{bm.verse}
            </div>
            <p style={{
              margin: 0,
              fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
              fontSize: "0.9375rem", lineHeight: "1.7", color: p.text,
              fontStyle: theme === "B" ? "italic" : "normal",
            }}>
              「{bm.text}」
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  // --- 通知画面 ---
  const notificationsScreen = (
    <div style={{
      maxWidth: layout === "full" ? "740px" : "100%",
      margin: layout === "full" ? "0 auto" : "0",
      padding: "32px 28px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" as const, alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{
          fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
          fontSize: "1.5rem", fontWeight: 700, color: p.text, margin: 0,
        }}>通知</h1>
        <button style={{ ...btn(p), padding: "5px 12px", fontSize: "0.8125rem" }}>すべて既読</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
        {NOTIFICATIONS_DATA.map(n => (
          <div key={n.id} style={{
            padding: "14px 18px",
            background: n.read ? p.bgAlt : (mode === "dark" ? p.bgHover : (theme === "B" ? "#fef9ee" : theme === "A" ? "#eff6ff" : "#ffffff")),
            border: `1px solid ${n.read ? p.border : p.accent}`,
            borderRadius: p.radius,
            borderLeft: `4px solid ${n.read ? p.border : p.accent}`,
            display: "flex", alignItems: "center", gap: "14px",
          }}>
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{n.type === "reply" ? "💬" : "▲"}</span>
            <div style={{ flex: 1, fontFamily: "system-ui" }}>
              <span style={{ fontWeight: 700, color: p.text, fontSize: "0.9375rem" }}>{n.actor}</span>
              <span style={{ color: p.textMuted, fontSize: "0.9375rem" }}> が{n.text}</span>
            </div>
            <span style={{ color: p.textFaint, fontFamily: "system-ui", fontSize: "0.75rem", flexShrink: 0 }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // --- ログイン画面 ---
  const loginScreen = (
    <div style={{
      maxWidth: "400px", margin: "60px auto",
      padding: "0 24px",
      fontFamily: theme === "B" ? "Georgia, serif" : "system-ui",
    }}>
      {theme === "B" ? (
        <div style={{ textAlign: "center" as const, marginBottom: "32px" }}>
          <div style={{ fontSize: "2.5rem", color: p.accent, lineHeight: 1 }}>✝</div>
          <div style={{ fontSize: "1.625rem", fontWeight: 700, color: p.text, marginTop: "8px", letterSpacing: "0.06em" }}>NeON Church</div>
          <div style={{ color: p.textMuted, fontSize: "0.875rem", fontStyle: "italic", marginTop: "4px" }}>御言葉とともに</div>
        </div>
      ) : (
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: p.text, marginBottom: "24px" }}>ログイン</h1>
      )}

      <div style={{
        background: p.bgAlt, border: `1px solid ${p.border}`,
        borderRadius: p.radius, padding: "28px",
      }}>
        {theme === "B" && (
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.125rem", fontWeight: 600, color: p.text, textAlign: "center" as const, marginBottom: "24px" }}>ログイン</h2>
        )}
        {[
          { label: "ユーザー名", type: "text", placeholder: "username" },
          { label: "パスワード", type: "password", placeholder: "••••••••" },
        ].map(field => (
          <div key={field.label} style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: p.text, marginBottom: "6px" }}>
              {field.label}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              style={{
                width: "100%", padding: "10px 12px",
                background: p.bg, color: p.text,
                border: `1px solid ${p.border}`,
                borderRadius: p.radiusSm,
                fontSize: "1rem", outline: "none", boxSizing: "border-box" as const,
              }}
            />
          </div>
        ))}
        <button onClick={() => setScreen("reading")} style={{
          ...btn(p, true),
          width: "100%", padding: "11px",
          fontSize: "1rem", fontWeight: 800, marginTop: "4px",
        }}>ログイン</button>
        <div style={{ textAlign: "center" as const, marginTop: "16px", fontSize: "0.875rem", color: p.textMuted }}>
          アカウントがない方は{" "}
          <button style={{ background: "none", border: "none", cursor: "pointer", color: p.accent, fontWeight: 700, padding: 0 }}>
            新規登録
          </button>
        </div>
      </div>
    </div>
  )

  const contentMap: Record<Screen, React.ReactNode> = {
    reading: readingScreen,
    bookmarks: bookmarksScreen,
    notifications: notificationsScreen,
    login: loginScreen,
  }

  return (
    <div style={{ background: p.bg, color: p.text, minHeight: "100vh", display: "flex", flexDirection: "column" as const }}>
      {ctrlBar}
      {navbar}
      <div style={{ display: "flex", flex: 1 }}>
        {layout === "sidebar" && screen !== "login" && sidebar}
        <main style={{ flex: 1, overflowY: "auto" as const }}>
          {contentMap[screen]}
        </main>
      </div>
    </div>
  )
}
