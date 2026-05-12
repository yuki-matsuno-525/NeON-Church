"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  fetchTranslation,
  fetchTranslationUnits,
  fetchTranslationComments,
  fetchUnitComments,
  fetchChapters,
  fetchVerses,
  joinTranslation,
  activateTranslation,
  publishTranslation,
  unpublishTranslation,
  updateMembershipStatus,
  removeMember,
  addTranslationUnit,
  updateTranslationUnit,
  postTranslationComment,
  postUnitComment,
  deleteTranslationComment,
  fetchTranslationMembers as fetchMembers,
  formatRelativeTime,
  type TranslationProject,
  type TranslationUnit,
  type TranslationMembership,
  type TranslationComment,
  type Chapter,
  type Verse,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<string, string> = {
  todo: "未着手",
  in_progress: "進行中",
  review: "レビュー中",
  done: "完了",
};

const STATUS_BADGE_COLOR: Record<string, string> = {
  todo: "var(--border)",
  in_progress: "var(--accent)",
  review: "#f59e0b",
  done: "#22c55e",
};

export default function TranslationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [project, setProject] = useState<TranslationProject | null>(null);
  const [units, setUnits] = useState<TranslationUnit[]>([]);
  const [members, setMembers] = useState<TranslationMembership[]>([]);
  const [comments, setComments] = useState<TranslationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"units" | "discussion" | "members">("units");

  // ユニット追加フォーム
  const [addingUnit, setAddingUnit] = useState(false);
  const [unitChapters, setUnitChapters] = useState<Chapter[]>([]);
  const [unitVerses, setUnitVerses] = useState<Verse[]>([]);
  const [unitChapterId, setUnitChapterId] = useState("");
  const [unitVerseId, setUnitVerseId] = useState("");

  // コメント投稿
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);

  // ユニット展開（コメント表示）
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [unitComments, setUnitComments] = useState<Record<string, TranslationComment[]>>({});
  const [unitCommentBody, setUnitCommentBody] = useState<Record<string, string>>({});
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const isOwner = user?.username === project?.owner_username;
  const isMember = project?.is_member ?? false;

  useEffect(() => {
    Promise.all([
      fetchTranslation(id),
      fetchTranslationUnits(id),
    ]).then(([proj, u]) => {
      setProject(proj);
      setUnits(u);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === "members" && isMember) {
      fetchMembers(id).then(setMembers).catch(() => {});
    }
    if (tab === "discussion") {
      fetchTranslationComments(id).then(setComments).catch(() => {});
    }
  }, [tab, id, isMember]);

  const handleJoin = async () => {
    await joinTranslation(id);
    const proj = await fetchTranslation(id);
    setProject(proj);
  };

  const handleStatusChange = async (action: "activate" | "publish" | "unpublish") => {
    let proj: TranslationProject;
    if (action === "activate") proj = await activateTranslation(id);
    else if (action === "publish") proj = await publishTranslation(id);
    else proj = await unpublishTranslation(id);
    setProject(proj);
  };

  const handleMemberAction = async (membershipId: string, action: "approved" | "rejected" | "remove") => {
    if (action === "remove") {
      await removeMember(id, membershipId);
    } else {
      await updateMembershipStatus(id, membershipId, action);
    }
    const m = await fetchMembers(id);
    setMembers(m);
  };

  const handleOpenAddUnit = () => {
    setAddingUnit(true);
    if (project && unitChapters.length === 0) {
      fetchChapters(project.source_book).then(setUnitChapters).catch(() => {});
    }
  };

  const handleUnitChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chId = e.target.value;
    setUnitChapterId(chId);
    setUnitVerseId("");
    setUnitVerses([]);
    if (chId) {
      fetchVerses(chId).then(setUnitVerses).catch(() => {});
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitChapterId) return;
    setAddingUnit(false);
    if (unitVerseId) {
      const unit = await addTranslationUnit(id, unitVerseId).catch(() => null);
      if (unit) setUnits((prev) => [...prev, unit]);
    } else {
      const verses = unitVerses.length > 0 ? unitVerses : await fetchVerses(unitChapterId).catch(() => []);
      const results = await Promise.all(verses.map((v) => addTranslationUnit(id, v.id).catch(() => null)));
      setUnits((prev) => [...prev, ...results.filter((u): u is TranslationUnit => u !== null)]);
    }
    setUnitChapterId("");
    setUnitVerseId("");
    setUnitVerses([]);
  };

  const handleUnitStatusChange = async (unitId: string, newStatus: TranslationUnit["status"]) => {
    const updated = await updateTranslationUnit(id, unitId, { status: newStatus });
    setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
  };

  const handleSaveBody = async (unitId: string) => {
    const updated = await updateTranslationUnit(id, unitId, { body: editBody });
    setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
    const proj = await fetchTranslation(id);
    setProject(proj);
    setEditingUnit(null);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    const c = await postTranslationComment(id, commentBody).catch(() => null);
    if (c) setComments((prev) => [c, ...prev]);
    setCommentBody("");
    setPosting(false);
  };

  const handleLoadUnitComments = async (unitId: string) => {
    if (expandedUnit === unitId) {
      setExpandedUnit(null);
      return;
    }
    setExpandedUnit(unitId);
    if (!unitComments[unitId]) {
      const cs = await fetchUnitComments(id, unitId).catch(() => []);
      setUnitComments((prev) => ({ ...prev, [unitId]: cs }));
    }
  };

  const handlePostUnitComment = async (unitId: string) => {
    const body = unitCommentBody[unitId]?.trim();
    if (!body) return;
    const c = await postUnitComment(id, unitId, body).catch(() => null);
    if (c) {
      setUnitComments((prev) => ({ ...prev, [unitId]: [c, ...(prev[unitId] ?? [])] }));
      setUnitCommentBody((prev) => ({ ...prev, [unitId]: "" }));
    }
  };

  const handleDeleteProjectComment = async (commentId: string) => {
    await deleteTranslationComment(id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>;
  if (!project) return <div style={{ padding: 32, color: "var(--text-muted)" }}>プロジェクトが見つかりません。</div>;

  const progressPct = project.unit_count > 0
    ? Math.round((project.done_count / project.unit_count) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 6 }}>
        <Link href="/translations" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          ← 翻訳プロジェクト一覧
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{project.name}</h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {project.source_book_name} → {project.target_language} ／ 作成: {project.owner_username}
          </div>
        </div>

        {/* オーナー操作 */}
        {isOwner && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {project.status === "draft" && (
              <button onClick={() => handleStatusChange("activate")} style={btnStyle("var(--accent)")}>
                募集開始
              </button>
            )}
            {project.status === "active" && (
              <button onClick={() => handleStatusChange("publish")} style={btnStyle("#22c55e")}>
                公開する
              </button>
            )}
            {project.status === "published" && (
              <>
                <Link
                  href={`/translations/${id}/read`}
                  style={{ ...btnStyle("var(--text-muted)"), textDecoration: "none" }}
                >
                  閲覧ページ
                </Link>
                <button onClick={() => handleStatusChange("unpublish")} style={btnStyle("#ef4444")}>
                  公開取り消し
                </button>
              </>
            )}
          </div>
        )}

        {/* 参加ボタン */}
        {user && !isOwner && !isMember && project.status === "active" && (
          <button onClick={handleJoin} style={btnStyle("var(--accent)")}>参加申請</button>
        )}
        {user && !isOwner && !isMember && project.status !== "active" && (
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>参加受付中ではありません</span>
        )}
        {project.status === "published" && (
          <Link href={`/translations/${id}/read`} style={{ ...btnStyle("#22c55e"), textDecoration: "none" }}>
            翻訳を読む
          </Link>
        )}
      </div>

      {project.description && (
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          {project.description}
        </p>
      )}

      {/* 進捗バー */}
      {project.unit_count > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            <span>進捗</span>
            <span>{project.done_count}/{project.unit_count} 節 ({progressPct}%)</span>
          </div>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "#22c55e", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 24, gap: 0 }}>
        {(["units", "discussion", "members"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 18px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t ? "var(--accent)" : "var(--text-muted)",
              fontWeight: tab === t ? 700 : 400,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {t === "units" ? "ユニット" : t === "discussion" ? "議論" : "メンバー"}
          </button>
        ))}
      </div>

      {/* ユニット一覧 */}
      {tab === "units" && (
        <div>
          {isOwner && (
            <div style={{ marginBottom: 16 }}>
              {!addingUnit ? (
                <button onClick={handleOpenAddUnit} style={btnStyle("var(--accent)")}>
                  ＋ ユニット追加
                </button>
              ) : (
                <form onSubmit={handleAddUnit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={unitChapterId}
                    onChange={handleUnitChapterChange}
                    style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text)", fontSize: 13 }}
                    required
                  >
                    <option value="">章を選択</option>
                    {unitChapters.map((c) => (
                      <option key={c.id} value={c.id}>{c.number}章</option>
                    ))}
                  </select>
                  {unitVerses.length > 0 && (
                    <select
                      value={unitVerseId}
                      onChange={(e) => setUnitVerseId(e.target.value)}
                      style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text)", fontSize: 13 }}
                    >
                      <option value="">全節を追加</option>
                      {unitVerses.map((v) => (
                        <option key={v.id} value={v.id}>{v.number}節</option>
                      ))}
                    </select>
                  )}
                  <button type="submit" disabled={!unitChapterId} style={btnStyle("var(--accent)")}>追加</button>
                  <button
                    type="button"
                    onClick={() => { setAddingUnit(false); setUnitChapterId(""); setUnitVerseId(""); setUnitVerses([]); }}
                    style={btnStyle("var(--border)")}
                  >
                    キャンセル
                  </button>
                </form>
              )}
            </div>
          )}

          {units.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {isOwner ? "ユニットを追加してください。" : "まだユニットがありません。"}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {units.map((unit) => (
                <div key={unit.id} style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-alt)", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                          {unit.chapter_number}章{unit.verse_number}節
                          {unit.assigned_to_username && (
                            <span style={{ marginLeft: 8 }}>担当: {unit.assigned_to_username}</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                          {unit.verse_text}
                        </p>
                        {unit.body && (
                          <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}>{unit.body}</p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: STATUS_BADGE_COLOR[unit.status],
                            color: unit.status === "todo" ? "var(--text-muted)" : "#fff",
                          }}
                        >
                          {STATUS_LABEL[unit.status]}
                        </span>
                      </div>
                    </div>

                    {/* 担当者操作（オーナーまたは担当者） */}
                    {(isOwner || unit.assigned_to_username === user?.username) && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        {editingUnit === unit.id ? (
                          <>
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={3}
                              style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 13, resize: "vertical", minWidth: 200 }}
                            />
                            <button onClick={() => handleSaveBody(unit.id)} style={btnStyle("var(--accent)")}>保存</button>
                            <button onClick={() => setEditingUnit(null)} style={btnStyle("var(--border)")}>キャンセル</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setEditingUnit(unit.id); setEditBody(unit.body); }}
                            style={btnStyle("var(--border)")}
                          >
                            訳文編集
                          </button>
                        )}
                        {unit.status !== "done" && (
                          <select
                            value={unit.status}
                            onChange={(e) => handleUnitStatusChange(unit.id, e.target.value as TranslationUnit["status"])}
                            style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)", color: "var(--text)", fontSize: 12 }}
                          >
                            <option value="todo">未着手</option>
                            <option value="in_progress">進行中</option>
                            <option value="review">レビュー中</option>
                            {isOwner && <option value="done">完了</option>}
                          </select>
                        )}
                        {isOwner && unit.status === "done" && (
                          <button onClick={() => handleUnitStatusChange(unit.id, "review")} style={btnStyle("#f59e0b")}>
                            差し戻し
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ユニットコメント */}
                  <div style={{ borderTop: "1px solid var(--border)", padding: "6px 16px" }}>
                    <button
                      onClick={() => handleLoadUnitComments(unit.id)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, padding: "4px 0" }}
                    >
                      {expandedUnit === unit.id ? "▲ 議論を閉じる" : "▼ 議論を見る"}
                      {unitComments[unit.id]?.length ? ` (${unitComments[unit.id].length})` : ""}
                    </button>
                    {expandedUnit === unit.id && (
                      <div style={{ marginTop: 8 }}>
                        {(unitComments[unit.id] ?? []).map((c) => (
                          <div key={c.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                            <span style={{ fontWeight: 600 }}>{c.username}</span>
                            <span style={{ color: "var(--text-faint)", fontSize: 11, marginLeft: 8 }}>{formatRelativeTime(c.created_at)}</span>
                            <p style={{ margin: "2px 0 0", color: c.is_deleted ? "var(--text-faint)" : "inherit" }}>{c.display_body}</p>
                          </div>
                        ))}
                        {isMember && (
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <input
                              value={unitCommentBody[unit.id] ?? ""}
                              onChange={(e) => setUnitCommentBody((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                              placeholder="コメントを入力..."
                              style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 13 }}
                            />
                            <button onClick={() => handlePostUnitComment(unit.id)} style={btnStyle("var(--accent)")}>送信</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 議論タブ */}
      {tab === "discussion" && (
        <div>
          {isMember && (
            <form onSubmit={handlePostComment} style={{ marginBottom: 24, display: "flex", gap: 8 }}>
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="プロジェクト全体への議論を投稿..."
                style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text)", fontSize: 14 }}
              />
              <button type="submit" disabled={posting} style={btnStyle("var(--accent)")}>投稿</button>
            </form>
          )}
          {comments.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>まだ議論はありません。</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.map((c) => (
                <div key={c.id} style={{ padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-alt)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.username}</span>
                    <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{formatRelativeTime(c.created_at)}</span>
                    {(c.username === user?.username || isOwner) && !c.is_deleted && (
                      <button
                        onClick={() => handleDeleteProjectComment(c.id)}
                        style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 12 }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: c.is_deleted ? "var(--text-faint)" : "inherit" }}>
                    {c.display_body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* メンバータブ */}
      {tab === "members" && (
        <div>
          {!isMember ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>メンバーのみ閲覧できます。</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.username}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {m.role === "owner" ? "オーナー" : "メンバー"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: m.status === "approved" ? "#22c55e" : m.status === "pending" ? "#f59e0b" : "#ef4444",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {m.status === "approved" ? "承認済み" : m.status === "pending" ? "承認待ち" : "拒否"}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {m.status === "pending" && (
                        <>
                          <button onClick={() => handleMemberAction(m.id, "approved")} style={btnStyle("#22c55e", true)}>承認</button>
                          <button onClick={() => handleMemberAction(m.id, "rejected")} style={btnStyle("#ef4444", true)}>拒否</button>
                        </>
                      )}
                      {m.status === "approved" && (
                        <button onClick={() => handleMemberAction(m.id, "remove")} style={btnStyle("#ef4444", true)}>除名</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, small = false): React.CSSProperties {
  return {
    background: bg,
    color: bg === "var(--border)" ? "var(--text)" : "#fff",
    border: "none",
    borderRadius: small ? 6 : 8,
    padding: small ? "4px 10px" : "7px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: small ? 12 : 13,
    whiteSpace: "nowrap" as const,
  };
}
