"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchTranslation,
  fetchTranslationUnits,
  fetchUnitComments,
  fetchChapters,
  fetchVerses,
  joinTranslation,
  activateTranslation,
  publishTranslation,
  unpublishTranslation,
  addTranslationToLibrary,
  removeTranslationFromLibrary,
  updateMembershipStatus,
  removeMember,
  addTranslationUnit,
  addBookToTranslation,
  removeBookFromTranslation,
  updateTranslationUnit,
  postUnitComment,
  deleteTranslation,
  fetchTranslationMembers as fetchMembers,
  assignTranslationUnit,
  formatRelativeTime,
  fetchBookmarks,
  createProjectBookmark,
  removeBookmark,
  type TranslationProject,
  type TranslationUnit,
  type TranslationMembership,
  type TranslationComment,
  type Chapter,
  type Verse,
  type Bookmark,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { SkeletonList, EmptyState, ConfirmDialog, Button, useToast } from "@/components/ui";
import { BookmarkStar } from "@/components/ui/BookmarkStar";
import { languageLabel } from "@/lib/languages";

const STATUS_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  todo:        { bg: "var(--bg-hover)",             color: "var(--text-muted)"    },
  in_progress: { bg: "var(--accent-tint)",          color: "var(--accent)"        },
  review:      { bg: "rgba(245,158,11,0.15)",       color: "var(--state-warning)" },
  done:        { bg: "rgba(34,197,94,0.15)",         color: "var(--state-success)" },
};

function MentionInput({
  value,
  onChange,
  onSubmit,
  members,
  placeholder,
  sendLabel,
  requiredMessage,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  members: string[];
  placeholder: string;
  sendLabel: string;
  requiredMessage: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // カーソルより前の部分の末尾にある @xxx を探して候補を更新する
  const refreshSuggestions = (text: string, caret: number) => {
    const match = text.slice(0, caret).match(/@([\w]*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      setSuggestions(members.filter((m) => m.toLowerCase().startsWith(q) && m !== "").slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    refreshSuggestions(e.target.value, e.target.selectionStart);
  };

  const handleSelect = (username: string) => {
    const el = textareaRef.current;
    const caret = el ? el.selectionStart : value.length;
    // カーソル位置の @xxx だけを置換し、後ろの文章はそのまま残す
    const before = value.slice(0, caret).replace(/@[\w]*$/, `@${username} `);
    const after = value.slice(caret);
    onChange(before + after);
    setSuggestions([]);
    // 置換後、カーソルを挿入した直後に戻す
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = before.length;
      }
    });
  };

  const handleSubmit = () => {
    // 空のまま押せたときは理由を出す。押せなくして黙って止めると理由が伝わらない。
    if (!value.trim()) {
      setError(requiredMessage);
      return;
    }
    setError(null);
    setSuggestions([]);
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter は改行。Ctrl/Cmd+Enter で送信。
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        rows={2}
        style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
      />
      {suggestions.length > 0 && (
        <ul style={{ position: "absolute", bottom: "100%", left: 0, margin: 0, padding: 0, listStyle: "none", background: "var(--bg-alt)", border: "1px solid var(--border)", borderRadius: 8, width: "100%", zIndex: 10 }}>
          {suggestions.map((s) => (
            <li
              key={s}
              onMouseDown={() => handleSelect(s)}
              style={{ padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-tint)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              @{s}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" aria-live="polite" style={{ color: "var(--state-danger)", fontSize: 12, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            padding: "6px 16px",
            border: "none",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--bg)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {sendLabel}
        </button>
      </div>
    </div>
  );
}

export default function TranslationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const t = useT();
  const [project, setProject] = useState<TranslationProject | null>(null);
  // 公開翻訳を自分の /read に追加済みか（トグルボタンの状態）
  const [inLibrary, setInLibrary] = useState(false);
  const [units, setUnits] = useState<TranslationUnit[]>([]);
  const [members, setMembers] = useState<TranslationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"units" | "review" | "members">("units");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteAllUnits, setConfirmDeleteAllUnits] = useState(false);
  const toast = useToast();

  const [addingUnit, setAddingUnit] = useState(false);
  const [unitChapters, setUnitChapters] = useState<Chapter[]>([]);
  const [unitVerses, setUnitVerses] = useState<Verse[]>([]);
  const [unitChapterId, setUnitChapterId] = useState("");
  const [unitVerseId, setUnitVerseId] = useState("");

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  // 「該当ユニットへ」で切り替えた後に、ユニット一覧の該当カードまでスクロール＆一時ハイライトする対象。
  const [scrollTargetUnit, setScrollTargetUnit] = useState<string | null>(null);
  const [confirmApproveUnit, setConfirmApproveUnit] = useState<string | null>(null);

  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [unitComments, setUnitComments] = useState<Record<string, TranslationComment[]>>({});
  const [unitCommentBody, setUnitCommentBody] = useState<Record<string, string>>({});
  // 訳文は常時入力できる。ユニットごとの下書きを保持し、保存すると unit.body に反映する。
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [savingUnit, setSavingUnit] = useState<string | null>(null);

  const isOwner = user?.username === project?.owner_username;

  // このプロジェクトのお気に入り（プロジェクト栞）。
  const [projectBookmark, setProjectBookmark] = useState<Bookmark | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchBookmarks()
      .then((bms) => {
        if (!active) return;
        const found = bms.find(
          (bm) => bm.target_type === "project" && bm.project_detail?.id === id
        );
        setProjectBookmark(found ?? null);
      })
      .catch(() => active && setProjectBookmark(null));
    return () => {
      active = false;
    };
  }, [user, id]);

  const toggleProjectBookmark = async () => {
    if (projectBusy) return;
    setProjectBusy(true);
    try {
      if (projectBookmark) {
        await removeBookmark(projectBookmark.id);
        setProjectBookmark(null);
      } else {
        setProjectBookmark(await createProjectBookmark(id));
      }
    } finally {
      setProjectBusy(false);
    }
  };

  const [addingBook, setAddingBook] = useState(false);
  const [removingBook, setRemovingBook] = useState(false);
  const isMember = project?.is_member ?? false;

  const statusLabel = (status: string) => {
    if (status === "todo") return t.statusPending;
    if (status === "in_progress") return t.statusInProgress;
    if (status === "review") return t.statusInReview;
    if (status === "done") return t.statusDone;
    return status;
  };

  const projectStatusLabel = (status: string) => {
    if (status === "active") return t.statusActive;
    if (status === "published") return t.statusPublished;
    if (status === "draft") return t.statusPending;
    return status;
  };

  const memberStatusLabel = (status: string) => {
    if (status === "approved") return t.statusApproved;
    if (status === "pending") return t.statusPendingApproval;
    return t.statusRejected;
  };

  useEffect(() => {
    Promise.all([
      fetchTranslation(id),
      fetchTranslationUnits(id),
    ]).then(([proj, u]) => {
      setProject(proj);
      setInLibrary(proj.is_in_library);
      setUnits(u);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === "members" && isMember) {
      fetchMembers(id).then(setMembers).catch(() => {});
    }
  }, [tab, id, isMember]);

  useEffect(() => {
    if (isMember) {
      fetchMembers(id).then(setMembers).catch(() => {});
    }
  }, [isMember, id]);

  // タブ・章の切り替えでカードが描画された後に、対象ユニットへスクロールしてハイライトする。
  useEffect(() => {
    if (!scrollTargetUnit) return;
    const el = document.getElementById(`unit-${scrollTargetUnit}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setScrollTargetUnit(null), 2000);
    return () => clearTimeout(timer);
  }, [scrollTargetUnit, tab, selectedChapter]);

  // レビューの「該当ユニットへ」。読書ページではなくユニット一覧の該当カードへ移動する。
  const handleOpenReviewTarget = (unit: TranslationUnit) => {
    setTab("units");
    setSelectedChapter(unit.chapter_number);
    setScrollTargetUnit(unit.id);
  };

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

  const handleToggleLibrary = async () => {
    if (inLibrary) {
      setInLibrary(false);
      await removeTranslationFromLibrary(id).catch(() => setInLibrary(true));
    } else {
      setInLibrary(true);
      await addTranslationToLibrary(id).catch(() => setInLibrary(false));
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await deleteTranslation(id);
    router.push("/translations");
  };

  const handleConfirmDeleteAllUnits = async () => {
    setConfirmDeleteAllUnits(false);
    if (!project) return;
    setRemovingBook(true);
    try {
      const res = await removeBookFromTranslation(id, project.source_book);
      toast.show(t.unitsDeleted(res.deleted), { type: "success" });
      const u = await fetchTranslationUnits(id);
      setUnits(u);
    } catch {
      /* ignore */
    } finally {
      setRemovingBook(false);
    }
  };

  // 空プロジェクトのガイドと上部ボタンで共用する「全章を一括追加」。
  const handleAddAllChapters = async () => {
    if (!project) return;
    setAddingBook(true);
    try {
      const res = await addBookToTranslation(id, project.source_book);
      toast.show(t.unitsAdded(res.created), { type: "success" });
      const u = await fetchTranslationUnits(id);
      setUnits(u);
    } catch {
      /* ignore */
    } finally {
      setAddingBook(false);
    }
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

  const handleAssignUnit = async (unitId: string, userId: string) => {
    const updated = await assignTranslationUnit(id, unitId, userId || null).catch(() => null);
    if (updated) setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
  };

  const handleUnitStatusChange = async (unitId: string, newStatus: TranslationUnit["status"]) => {
    const updated = await updateTranslationUnit(id, unitId, { status: newStatus });
    setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
  };

  const handleSaveBody = async (unitId: string) => {
    const current = units.find((u) => u.id === unitId);
    if (!current) return;
    const body = unitDrafts[unitId] ?? current.body;
    setSavingUnit(unitId);
    try {
      // 未着手のまま訳文を保存したら、自動で「進行中」に進める。
      const data: { body: string; status?: TranslationUnit["status"] } = { body };
      if (current.status === "todo") data.status = "in_progress";
      const updated = await updateTranslationUnit(id, unitId, data);
      setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
      // 保存後は下書きを破棄し、表示ソースを updated.body に戻す（未保存マークも消える）。
      setUnitDrafts((prev) => {
        const next = { ...prev };
        delete next[unitId];
        return next;
      });
      const proj = await fetchTranslation(id);
      setProject(proj);
    } finally {
      setSavingUnit(null);
    }
  };

  const renderCommentBody = (body: string) => {
    const parts = body.split(/(@[\w]+)/g);
    return parts.map((p, i) =>
      p.startsWith("@") ? <strong key={i} style={{ color: "var(--accent)" }}>{p}</strong> : p
    );
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

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <SkeletonList count={4} />
      </div>
    );
  }
  if (!project) return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.noProjects}</div>;

  const progressPct = project.unit_count > 0
    ? Math.round((project.done_count / project.unit_count) * 100)
    : 0;
  const progressText = project.unit_count > 0
    ? `${project.done_count}/${project.unit_count} (${progressPct}%)`
    : `${project.done_count}/${project.unit_count}`;
  const reviewUnits = units.filter((u) => u.status === "review");
  const reviewCount = reviewUnits.length;

  const tabLabel = (tabKey: "units" | "review" | "members") => {
    if (tabKey === "units") return t.units;
    if (tabKey === "review") {
      return `${t.review}${reviewCount > 0 ? ` (${reviewCount})` : ""}`;
    }
    return t.members;
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/translations" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          {t.backToTranslations}
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "0 0 4px" }}>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, margin: 0 }}>{project.name}</h1>
            {user && (
              <BookmarkStar
                active={!!projectBookmark}
                busy={projectBusy}
                onToggle={toggleProjectBookmark}
                size={18}
              />
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {project.source_book_name} → {languageLabel(project.target_language)} ／ {t.createdBy} {project.owner_username}
          </div>
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {project.status === "draft" && (
              <button onClick={() => handleStatusChange("activate")} style={btnStyle("var(--accent)")}>
                {t.startRecruiting}
              </button>
            )}
            {project.status === "active" && (
              <button onClick={() => handleStatusChange("publish")} style={btnStyle("var(--state-success)")}>
                {t.publish}
              </button>
            )}
            {project.status === "published" && (
              <>
                <Link
                  href={`/translations/${id}/read`}
                  style={{ ...btnStyle("var(--text-muted)"), textDecoration: "none" }}
                >
                  {t.viewPage}
                </Link>
                <button onClick={() => handleStatusChange("unpublish")} style={btnStyle("var(--state-danger)")}>
                  {t.unpublish}
                </button>
              </>
            )}
            <button onClick={() => setConfirmDelete(true)} style={btnStyle("var(--state-danger)")}>
              {t.delete}
            </button>
          </div>
        )}

        {user && !isOwner && !isMember && project.status === "active" && (
          <button onClick={handleJoin} style={btnStyle("var(--accent)")}>{t.applyMembership}</button>
        )}
        {user && !isOwner && !isMember && project.status !== "active" && project.status !== "published" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              color: "var(--text-muted)",
              backgroundColor: "var(--bg-alt)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            {t.notRecruiting}
          </span>
        )}
        {project.status === "published" && (
          <Link href={`/translations/${id}/read`} style={{ ...btnStyle("var(--accent)"), textDecoration: "none" }}>
            {t.readTranslation}
          </Link>
        )}
        {user && project.status === "published" && (
          <button
            onClick={handleToggleLibrary}
            style={btnStyle(inLibrary ? "var(--text-muted)" : "var(--accent)")}
          >
            {inLibrary ? t.removeFromLibrary : t.addToLibrary}
          </button>
        )}
      </div>

      {project.description && (
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          {project.description}
        </p>
      )}

      <div style={projectSummaryGridStyle}>
        <div style={projectSummaryItemStyle}>
          <span style={projectSummaryLabelStyle}>{t.status}</span>
          <strong style={projectSummaryValueStyle}>{projectStatusLabel(project.status)}</strong>
        </div>
        <div style={projectSummaryItemStyle}>
          <span style={projectSummaryLabelStyle}>{t.progress}</span>
          <strong style={projectSummaryValueStyle}>{progressText}</strong>
          <div
            role="progressbar"
            aria-label={t.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            style={detailProgressTrackStyle}
          >
            <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--accent)", borderRadius: 999, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={projectSummaryItemStyle}>
          <span style={projectSummaryLabelStyle}>{t.review}</span>
          <strong style={projectSummaryValueStyle}>{reviewCount}</strong>
        </div>
        <div style={projectSummaryItemStyle}>
          <span style={projectSummaryLabelStyle}>{t.units}</span>
          <strong style={projectSummaryValueStyle}>{project.unit_count}</strong>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 24, gap: 0 }}>
        {(["units", "review", "members"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            aria-current={tab === tabKey ? "page" : undefined}
            style={{
              padding: "8px 18px",
              background: "transparent",
              border: "none",
              borderBottom: tab === tabKey ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === tabKey ? "var(--accent)" : "var(--text-muted)",
              fontWeight: tab === tabKey ? 700 : 400,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {tabLabel(tabKey)}
          </button>
        ))}
      </div>

      {tab === "units" && (
        <div>
          {isOwner && (
            <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                disabled={addingBook}
                onClick={handleAddAllChapters}
                style={btnStyle("var(--accent)")}
              >
                {addingBook ? t.adding : t.addAllChapters}
              </button>
              <button
                disabled={removingBook}
                onClick={() => setConfirmDeleteAllUnits(true)}
                style={btnStyle("var(--state-danger)")}
              >
                {removingBook ? t.deleting : t.deleteAllUnits}
              </button>
              {!addingUnit ? (
                <button onClick={handleOpenAddUnit} style={btnStyle("var(--accent)")}>
                  {t.addUnit}
                </button>
              ) : (
                <form onSubmit={handleAddUnit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={unitChapterId}
                    onChange={handleUnitChapterChange}
                    style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text)", fontSize: 13 }}
                    required
                  >
                    <option value="">{t.selectChapter}</option>
                    {unitChapters.map((c) => (
                      <option key={c.id} value={c.id}>{c.number}</option>
                    ))}
                  </select>
                  {unitVerses.length > 0 && (
                    <select
                      value={unitVerseId}
                      onChange={(e) => setUnitVerseId(e.target.value)}
                      style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text)", fontSize: 13 }}
                    >
                      <option value="">{t.addAllVerses}</option>
                      {unitVerses.map((v) => (
                        <option key={v.id} value={v.id}>{v.number}</option>
                      ))}
                    </select>
                  )}
                  {/* 未選択でも押せるようにする。select の required でブラウザが理由を出す。
                      押せなくすると、なぜ押せないのかが伝わらない。 */}
                  <button type="submit" style={btnStyle("var(--accent)")}>{t.add}</button>
                  <button
                    type="button"
                    onClick={() => { setAddingUnit(false); setUnitChapterId(""); setUnitVerseId(""); setUnitVerses([]); }}
                    style={btnStyle("var(--border)")}
                  >
                    {t.cancel}
                  </button>
                </form>
              )}
            </div>
          )}

          {selectedChapter === null && (
            units.length === 0 ? (
              <EmptyState
                title={t.noUnits}
                description={isOwner ? t.emptyUnitsDesc : t.noUnitsMsg}
                action={
                  isOwner ? (
                    <Button variant="primary" onClick={handleAddAllChapters} disabled={addingBook}>
                      {addingBook ? t.adding : t.addAllChapters}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                  gap: 8,
                }}
              >
                {[...new Set(units.map((u) => u.chapter_number))].sort((a, b) => a - b).map((chNum) => (
                  <button
                    key={chNum}
                    onClick={() => setSelectedChapter(chNum)}
                    className="card-glow card-glow-interactive"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 48,
                      color: "var(--text)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {chNum}
                  </button>
                ))}
              </div>
            )
          )}

          {selectedChapter !== null && (
            <div>
              <button
                onClick={() => setSelectedChapter(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 0 12px", display: "block" }}
              >
                {t.backToChapters}
              </button>
              <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: 700, marginBottom: "var(--space-3)", paddingBottom: "var(--space-2)", borderBottom: "1px solid var(--border)" }}>{selectedChapter}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {units.filter((u) => u.chapter_number === selectedChapter).map((unit) => (
                <div
                  key={unit.id}
                  id={`unit-${unit.id}`}
                  className="card-glow"
                  style={{
                    overflow: "hidden",
                    boxShadow: scrollTargetUnit === unit.id ? "0 0 0 2px var(--accent)" : undefined,
                    transition: "box-shadow 0.3s",
                  }}
                >
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", flex: 1, minWidth: 0 }}>
                        {unit.chapter_number}:{unit.verse_number}
                        {unit.assigned_to_username && (
                          <span style={{ marginLeft: 8 }}>{t.assignee} {unit.assigned_to_username}</span>
                        )}
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: STATUS_BADGE_STYLE[unit.status]?.bg ?? "var(--bg-hover)",
                          color: STATUS_BADGE_STYLE[unit.status]?.color ?? "var(--text-muted)",
                        }}
                      >
                        {statusLabel(unit.status)}
                      </span>
                    </div>

                    {(() => {
                      const canEdit = isOwner || unit.assigned_to_username === user?.username;
                      const draft = unitDrafts[unit.id] ?? unit.body;
                      const dirty = draft !== unit.body;
                      const saving = savingUnit === unit.id;
                      return (
                    <>
                    {/* 元テキスト（左）と訳文（右）を枠付きカードで並べ、見比べながら翻訳できるようにする。狭い画面では自動で縦に積む。 */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                      <div style={subCardStyle}>
                        <div style={colLabelStyle}>{t.sourceText}</div>
                        <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--text)", fontStyle: "italic", lineHeight: 1.7, fontFamily: '"Noto Serif JP", serif' }}>
                          {unit.verse_text}
                        </p>
                      </div>
                      <div style={subCardStyle}>
                        <div style={colLabelStyle}>{t.translationText}</div>
                        {canEdit ? (
                          // 訳文欄は常時編集可能。「訳文編集」ボタンを押さずに直接入力できる。
                          <textarea
                            value={draft}
                            onChange={(e) => setUnitDrafts((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                            rows={5}
                            placeholder={t.translationPlaceholder}
                            style={{ flex: 1, width: "100%", minHeight: 96, marginTop: 6, padding: 0, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6, outline: "none" }}
                          />
                        ) : unit.body ? (
                          <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}>{unit.body}</p>
                        ) : (
                          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-faint)" }}>{t.notTranslatedYet}</p>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      // 元テキスト側の下に担当者/ステータス、訳文側の下に保存ボタン（画像の構成に合わせる）。
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                          {isOwner && (
                            <label style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={fieldLabelStyle}>{t.assigneeLabel}</span>
                              <select
                                value={unit.assigned_to ?? ""}
                                onChange={(e) => handleAssignUnit(unit.id, e.target.value)}
                                style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)", color: "var(--text)", fontSize: 12 }}
                              >
                                <option value="">{t.noAssignee}</option>
                                {members.filter((m) => m.status === "approved").map((m) => (
                                  <option key={m.id} value={m.user}>{m.username}</option>
                                ))}
                              </select>
                            </label>
                          )}
                          {unit.status !== "done" && (
                            <label style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={fieldLabelStyle}>{t.statusFieldLabel}</span>
                              <select
                                value={unit.status}
                                onChange={(e) => handleUnitStatusChange(unit.id, e.target.value as TranslationUnit["status"])}
                                style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)", color: "var(--text)", fontSize: 12 }}
                              >
                                <option value="todo">{t.statusPending}</option>
                                <option value="in_progress">{t.statusInProgress}</option>
                                <option value="review">{t.statusInReview}</option>
                                {isOwner && <option value="done">{t.statusDone}</option>}
                              </select>
                            </label>
                          )}
                          {isOwner && unit.status === "done" && (
                            <button onClick={() => handleUnitStatusChange(unit.id, "review")} style={btnStyle("var(--state-warning)")}>
                              {t.sendBack}
                            </button>
                          )}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start" }}>
                          {/* 未保存の変更があるときだけ押せる。 */}
                          <button
                            onClick={() => handleSaveBody(unit.id)}
                            disabled={saving || !dirty}
                            style={{ ...btnStyle("var(--accent)"), opacity: saving || !dirty ? 0.5 : 1, cursor: saving || !dirty ? "default" : "pointer" }}
                          >
                            {saving ? t.saving : t.save}
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                      );
                    })()}
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", padding: "6px 16px" }}>
                    <button
                      onClick={() => handleLoadUnitComments(unit.id)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, padding: "4px 0" }}
                    >
                      {expandedUnit === unit.id ? t.closeDiscussion : t.openDiscussion}
                      {unitComments[unit.id]?.length ? ` (${unitComments[unit.id].length})` : ""}
                    </button>
                    {expandedUnit === unit.id && (
                      <div style={{ marginTop: 8 }}>
                        {(unitComments[unit.id] ?? []).map((c) => (
                          <div key={c.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                            <span style={{ fontWeight: 600 }}>{c.username}</span>
                            <span style={{ color: "var(--text-faint)", fontSize: 11, marginLeft: 8 }}>{formatRelativeTime(c.created_at)}</span>
                            <p style={{ margin: "2px 0 0", color: c.is_deleted ? "var(--text-faint)" : "inherit" }}>
                              {c.is_deleted ? c.display_body : renderCommentBody(c.display_body)}
                            </p>
                          </div>
                        ))}
                        {isMember && (
                          <MentionInput
                            value={unitCommentBody[unit.id] ?? ""}
                            onChange={(v) => setUnitCommentBody((prev) => ({ ...prev, [unit.id]: v }))}
                            onSubmit={() => handlePostUnitComment(unit.id)}
                            members={members.filter((m) => m.status === "approved").map((m) => m.username)}
                            placeholder={t.mentionPlaceholder}
                            sendLabel={t.sendComment}
                            requiredMessage={t.missingFields([t.fieldBody])}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}

      {tab === "review" && (
        <div>
          {reviewUnits.length === 0 ? (
            <EmptyState title={t.noReviewUnits} description={t.emptyReviewUnitsDesc} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reviewUnits.map((unit) => (
                <div key={unit.id} className="card-glow" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", flex: 1, minWidth: 0 }}>
                        {unit.chapter_number}:{unit.verse_number}
                        {unit.assigned_to_username && (
                          <span style={{ marginLeft: 8 }}>{t.assignee} {unit.assigned_to_username}</span>
                        )}
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: STATUS_BADGE_STYLE[unit.status]?.bg ?? "var(--bg-hover)",
                          color: STATUS_BADGE_STYLE[unit.status]?.color ?? "var(--text-muted)",
                        }}
                      >
                        {statusLabel(unit.status)}
                      </span>
                    </div>

                    {/* ユニットタブと同じ枠付きカードで元テキストと訳文を並べる。 */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                      <div style={subCardStyle}>
                        <div style={colLabelStyle}>{t.sourceText}</div>
                        <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--text)", fontStyle: "italic", lineHeight: 1.7, fontFamily: '"Noto Serif JP", serif' }}>
                          {unit.verse_text}
                        </p>
                      </div>
                      <div style={subCardStyle}>
                        <div style={colLabelStyle}>{t.translationText}</div>
                        {unit.body ? (
                          <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}>{unit.body}</p>
                        ) : (
                          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-faint)" }}>{t.notTranslatedYet}</p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenReviewTarget(unit)}
                        style={btnStyle("var(--accent)")}
                      >
                        {t.openReviewTarget}
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => setConfirmApproveUnit(unit.id)}
                          style={btnStyle("var(--state-success)")}
                        >
                          {t.approve}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "members" && (
        <div>
          {!isMember ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.membersOnly}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.username}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {m.role === "owner" ? t.roleOwner : t.roleMember}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: m.status === "approved" ? "rgba(34,197,94,0.15)" : m.status === "pending" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      color: m.status === "approved" ? "var(--state-success)" : m.status === "pending" ? "var(--state-warning)" : "var(--state-danger)",
                    }}
                  >
                    {memberStatusLabel(m.status)}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {m.status === "pending" && (
                        <>
                          <button onClick={() => handleMemberAction(m.id, "approved")} style={btnStyle("var(--state-success)", true)}>{t.approve}</button>
                          <button onClick={() => handleMemberAction(m.id, "rejected")} style={btnStyle("var(--state-danger)", true)}>{t.reject}</button>
                        </>
                      )}
                      {m.status === "approved" && (
                        <button onClick={() => handleMemberAction(m.id, "remove")} style={btnStyle("var(--state-danger)", true)}>{t.kick}</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t.confirmDeleteProject}
        confirmText={t.delete}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmDeleteAllUnits}
        title={t.confirmDeleteAllUnits}
        confirmText={t.deleteAllUnits}
        destructive
        onConfirm={handleConfirmDeleteAllUnits}
        onCancel={() => setConfirmDeleteAllUnits(false)}
      />
      <ConfirmDialog
        open={confirmApproveUnit !== null}
        title={t.confirmApproveTitle}
        description={t.confirmApproveDesc}
        confirmText={t.approve}
        onConfirm={() => {
          const unitId = confirmApproveUnit;
          setConfirmApproveUnit(null);
          if (unitId) handleUnitStatusChange(unitId, "done");
        }}
        onCancel={() => setConfirmApproveUnit(null)}
      />
    </div>
  );
}

// resume バッジ風の淡いピル。色相で役割を残しつつ統一感を出す。
// 緑(success)は統一感のためアクセント紫に寄せる。
function btnStyle(color: string, small = false): React.CSSProperties {
  const c = color === "var(--state-success)" ? "var(--accent)" : color;
  const neutral = c === "var(--border)" || c === "var(--text-muted)";
  const tint = neutral
    ? "var(--bg-hover)"
    : c === "var(--state-danger)"
      ? "rgba(239, 68, 68, 0.15)"
      : c === "var(--state-warning)"
        ? "rgba(245, 158, 11, 0.15)"
        : "var(--accent-tint)";
  return {
    background: tint,
    color: neutral ? "var(--text-muted)" : c,
    border: "none",
    borderRadius: 999,
    padding: small ? "3px 10px" : "5px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: small ? 12 : 13,
    whiteSpace: "nowrap" as const,
    textDecoration: "none",
    display: "inline-block",
  };
}

const subCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "12px 14px",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--bg-alt)",
  minWidth: 0,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-faint)",
  marginBottom: 4,
};

const colLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-faint)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const projectSummaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 8,
  marginBottom: 24,
};

const projectSummaryItemStyle: React.CSSProperties = {
  minHeight: 70,
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-alt)",
  boxSizing: "border-box",
};

const projectSummaryLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 600,
};

const projectSummaryValueStyle: React.CSSProperties = {
  display: "block",
  color: "var(--text)",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.3,
};

const detailProgressTrackStyle: React.CSSProperties = {
  height: 6,
  width: "100%",
  marginTop: 8,
  borderRadius: 999,
  overflow: "hidden",
  background: "var(--border)",
};
