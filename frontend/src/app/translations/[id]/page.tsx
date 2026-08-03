"use client";

import { useEffect, useEffectEvent, useMemo, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchTranslation,
  updateTranslation,
  fetchTranslationLanguages,
  fetchTranslationUnits,
  fetchTranslationUnitSummary,
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
  deleteTranslationUnit,
  postUnitComment,
  deleteTranslation,
  fetchTranslationMembers as fetchMembers,
  assignTranslationUnit,
  fetchProjectBookmarks,
  createProjectBookmark,
  removeBookmark,
  type TranslationProject,
  type TranslationUnit,
  type TranslationUnitSummary,
  type TranslationMembership,
  type TranslationComment,
  type Chapter,
  type Verse,
  type Bookmark,
  type TranslationLanguage,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRelativeTime, useT } from "@/lib/i18n";
import { SkeletonList, EmptyState, ConfirmDialog, Button, useToast } from "@/components/ui";
import { BookmarkStar } from "@/components/ui/BookmarkStar";
import { languageLabel } from "@/lib/languages";
import { useLang } from "@/contexts/LanguageContext";
import { translationUiText } from "../translationUiText";
import { ReviewTab } from "@/components/translations/ReviewTab";
import { MembersTab } from "@/components/translations/MembersTab";
import { STATUS_BADGE_STYLE, unitStatusLabel } from "@/components/translations/unitStatus";
import { handleHorizontalTabListKeyDown } from "@/lib/a11y";

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
    <div className="relative mt-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-autocomplete="list"
        rows={2}
        style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", color: "var(--text)", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
      />
      {suggestions.length > 0 && (
        <ul role="listbox" style={{ position: "absolute", bottom: "100%", left: 0, margin: 0, padding: 0, listStyle: "none", background: "var(--bg-alt)", border: "1px solid var(--border)", borderRadius: 8, width: "100%", zIndex: 10 }}>
          {suggestions.map((s) => (
            <li key={s} role="option" aria-selected="false">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(s)}
                style={{ width: "100%", minHeight: 44, padding: "6px 12px", cursor: "pointer", fontSize: 13, textAlign: "left", background: "transparent", color: "var(--text)", border: 0 }}
              >
                @{s}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" aria-live="polite" className="text-danger text-xs mt-1 mx-0 mb-0">
          {error}
        </p>
      )}
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="tap-target py-2 px-4 border-0 rounded-md bg-accent text-bg font-bold text-sm cursor-pointer"
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
  const formatRelativeTime = useRelativeTime();
  const { lang } = useLang();
  const ui = translationUiText(lang);
  const [project, setProject] = useState<TranslationProject | null>(null);
  // 公開翻訳を自分の /read に追加済みか（トグルボタンの状態）
  const [inLibrary, setInLibrary] = useState(false);
  // units は「いま開いている章」の分だけ。企画全体は summary（章一覧と件数）で扱う。
  const [units, setUnits] = useState<TranslationUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [reviewUnits, setReviewUnits] = useState<TranslationUnit[]>([]);
  const [summary, setSummary] = useState<TranslationUnitSummary | null>(null);
  const [members, setMembers] = useState<TranslationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [tab, setTab] = useState<"units" | "review" | "members">("units");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteAllUnits, setConfirmDeleteAllUnits] = useState(false);
  const [confirmStatusAction, setConfirmStatusAction] = useState<"activate" | "publish" | "unpublish" | null>(null);
  const [confirmMemberAction, setConfirmMemberAction] = useState<{ id: string; action: "rejected" | "remove" } | null>(null);
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<string | null>(null);
  const [pendingDiscardNavigation, setPendingDiscardNavigation] = useState<PendingDiscardNavigation | null>(null);
  const [confirmAddChapterVerses, setConfirmAddChapterVerses] = useState<Verse[] | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const toast = useToast();
  const showLoadError = useEffectEvent(() => toast.show(ui.loadError, { type: "error" }));

  const [addingUnit, setAddingUnit] = useState(false);
  const [unitChapters, setUnitChapters] = useState<Chapter[]>([]);
  const [unitVerses, setUnitVerses] = useState<Verse[]>([]);
  const [unitChapterId, setUnitChapterId] = useState("");
  const [unitVerseId, setUnitVerseId] = useState("");

  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [unitStatusFilter, setUnitStatusFilter] = useState<"all" | TranslationUnit["status"]>("all");
  const [unitAssigneeFilter, setUnitAssigneeFilter] = useState<"all" | "me">("all");
  // 「該当ユニットへ」で切り替えた後に、ユニット一覧の該当カードまでスクロール＆一時ハイライトする対象。
  const [scrollTargetUnit, setScrollTargetUnit] = useState<string | null>(null);
  const [confirmApproveUnit, setConfirmApproveUnit] = useState<string | null>(null);
  const [confirmSendBackUnit, setConfirmSendBackUnit] = useState<string | null>(null);

  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [unitComments, setUnitComments] = useState<Record<string, TranslationComment[]>>({});
  const [unitCommentsLoading, setUnitCommentsLoading] = useState<string | null>(null);
  const [unitCommentErrors, setUnitCommentErrors] = useState<Record<string, string>>({});
  const [unitCommentBody, setUnitCommentBody] = useState<Record<string, string>>({});
  // 訳文は常時入力できる。ユニットごとの下書きを保持し、保存すると unit.body に反映する。
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [savingUnit, setSavingUnit] = useState<string | null>(null);
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});

  const [editingProject, setEditingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState("");
  const [projectLanguageDraft, setProjectLanguageDraft] = useState("");
  const [translationLanguages, setTranslationLanguages] = useState<TranslationLanguage[]>([]);

  const isOwner = Boolean(user && project && user.username === project.owner_username);
  const isApprovedMember = project?.membership_status === "approved" || isOwner;
  const hasUnsavedUnits = useMemo(
    () => units.some((unit) => (unitDrafts[unit.id] ?? unit.body) !== unit.body),
    [units, unitDrafts],
  );

  useEffect(() => {
    if (!hasUnsavedUnits) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedUnits]);

  const changeTab = (nextTab: "units" | "review" | "members") => {
    if (nextTab === tab) return;
    if (hasUnsavedUnits) {
      setPendingDiscardNavigation({ kind: "tab", value: nextTab });
      return;
    }
    if (nextTab === "review") setReviewLoading(true);
    if (nextTab === "members") setMembersLoading(true);
    setTab(nextTab);
  };

  const changeChapter = (chapter: number | null) => {
    if (chapter === selectedChapter) return;
    if (hasUnsavedUnits) {
      setPendingDiscardNavigation({ kind: "chapter", value: chapter });
      return;
    }
    setSelectedChapter(chapter);
  };

  const guardNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasUnsavedUnits) return;
    event.preventDefault();
    const href = event.currentTarget.getAttribute("href");
    if (href) setPendingDiscardNavigation({ kind: "href", value: href });
  };

  const handleConfirmDiscardNavigation = () => {
    const pending = pendingDiscardNavigation;
    setPendingDiscardNavigation(null);
    if (!pending) return;
    if (pending.kind === "tab") {
      if (pending.value === "review") setReviewLoading(true);
      if (pending.value === "members") setMembersLoading(true);
      setTab(pending.value);
    } else if (pending.kind === "chapter") {
      setSelectedChapter(pending.value);
    } else if (pending.kind === "href") {
      router.push(pending.value);
    } else if (pending.kind === "review-target") {
      setTab("units");
      setUnitStatusFilter("all");
      setUnitAssigneeFilter("all");
      setSelectedChapter(pending.value.chapter);
      setScrollTargetUnit(pending.value.unitId);
    } else if (pending.kind === "status-filter") {
      setUnitStatusFilter(pending.value);
    } else {
      setUnitAssigneeFilter(pending.value);
    }
  };

  // このプロジェクトのお気に入り。
  const [projectBookmark, setProjectBookmark] = useState<Bookmark | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchProjectBookmarks(id)
      .then((bms) => {
        if (!active) return;
        setProjectBookmark(bms[0] ?? null);
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

  const projectStatusLabel = (status: string) => {
    if (status === "active") return t.statusActive;
    if (status === "published") return t.statusPublished;
    if (status === "draft") return t.colDraftLabel;
    return status;
  };

  // 企画全体のユニットは取らない。章ボタンとレビュー件数は summary から出し、
  // 節そのものは章を開いたときにその章の分だけ取る。書を丸ごと追加できるので、
  // 全件取ると詩篇なら2400件超が画面を開くたびに飛んでいた。
  const reloadSummary = () => fetchTranslationUnitSummary(id).then(setSummary).catch(() => {
    toast.show(ui.loadError, { type: "error" });
  });

  const loadProject = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [proj, s] = await Promise.all([
        fetchTranslation(id),
        fetchTranslationUnitSummary(id),
      ]);
      setProject(proj);
      setInLibrary(proj.is_in_library);
      setSummary(s);
      setProjectNameDraft(proj.name);
      setProjectDescriptionDraft(proj.description);
      setProjectLanguageDraft(proj.target_language);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([fetchTranslation(id), fetchTranslationUnitSummary(id)])
      .then(([proj, s]) => {
        if (!active) return;
        setProject(proj);
        setInLibrary(proj.is_in_library);
        setSummary(s);
        setProjectNameDraft(proj.name);
        setProjectDescriptionDraft(proj.description);
        setProjectLanguageDraft(proj.target_language);
      })
      .catch(() => active && setLoadError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  // 章を開いたら、その章のユニットだけ取る。
  useEffect(() => {
    if (selectedChapter === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnits([]);
      return;
    }
    let cancelled = false;
    setUnitsLoading(true);
    fetchTranslationUnits(id, {
      chapter: selectedChapter,
      status: unitStatusFilter === "all" ? undefined : unitStatusFilter,
      assigned_to: unitAssigneeFilter === "me" ? "me" : undefined,
    })
      .then((u) => { if (!cancelled) setUnits(u); })
      .catch(() => {
        if (!cancelled) {
          setUnits([]);
          showLoadError();
        }
      })
      .finally(() => { if (!cancelled) setUnitsLoading(false); });
    return () => { cancelled = true; };
  }, [id, selectedChapter, unitStatusFilter, unitAssigneeFilter]);

  // レビュータブは章をまたぐので、状態で絞って別に取る。
  useEffect(() => {
    if (tab !== "review") return;
    let cancelled = false;
    fetchTranslationUnits(id, { status: "review" })
      .then((u) => { if (!cancelled) setReviewUnits(u); })
      .catch(() => {
        if (!cancelled) {
          setReviewUnits([]);
          showLoadError();
        }
      })
      .finally(() => { if (!cancelled) setReviewLoading(false); });
    return () => { cancelled = true; };
  }, [id, tab, summary]);

  useEffect(() => {
    if (tab === "members" && isApprovedMember) {
      fetchMembers(id)
        .then(setMembers)
        .catch(() => showLoadError())
        .finally(() => setMembersLoading(false));
    }
  }, [tab, id, isApprovedMember]);

  useEffect(() => {
    if (isApprovedMember && tab !== "members") {
      fetchMembers(id).then(setMembers).catch(() => showLoadError());
    }
  }, [isApprovedMember, id, tab]);

  // タブ・章の切り替えでカードが描画された後に、対象ユニットへスクロールしてハイライトする。
  useEffect(() => {
    if (!scrollTargetUnit) return;
    const el = document.getElementById(`unit-${scrollTargetUnit}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setScrollTargetUnit(null), 2000);
    return () => clearTimeout(timer);
  }, [scrollTargetUnit, tab, selectedChapter, units, unitsLoading]);

  // レビューの「該当ユニットへ」。読書ページではなくユニット一覧の該当カードへ移動する。
  const handleOpenReviewTarget = (unit: TranslationUnit) => {
    if (hasUnsavedUnits) {
      setPendingDiscardNavigation({
        kind: "review-target",
        value: { chapter: unit.chapter_number, unitId: unit.id },
      });
      return;
    }
    setTab("units");
    setUnitStatusFilter("all");
    setUnitAssigneeFilter("all");
    setSelectedChapter(unit.chapter_number);
    setScrollTargetUnit(unit.id);
  };

  const handleJoin = async () => {
    if (actionBusy) return;
    setActionBusy("join");
    try {
      await joinTranslation(id);
      const proj = await fetchTranslation(id);
      setProject(proj);
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleStatusChange = async (action: "activate" | "publish" | "unpublish") => {
    setConfirmStatusAction(null);
    if (actionBusy) return;
    setActionBusy(action);
    try {
      let proj: TranslationProject;
      if (action === "activate") proj = await activateTranslation(id);
      else if (action === "publish") proj = await publishTranslation(id);
      else proj = await unpublishTranslation(id);
      setProject(proj);
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleLibrary = async () => {
    if (inLibrary) {
      setInLibrary(false);
      await removeTranslationFromLibrary(id).catch(() => {
        setInLibrary(true);
        toast.show(ui.actionFailed, { type: "error" });
      });
    } else {
      setInLibrary(true);
      await addTranslationToLibrary(id).catch(() => {
        setInLibrary(false);
        toast.show(ui.actionFailed, { type: "error" });
      });
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setActionBusy("delete-project");
    try {
      await deleteTranslation(id);
      router.push("/translations");
    } catch {
      setActionBusy(null);
      toast.show(ui.actionFailed, { type: "error" });
    }
  };

  const handleConfirmDeleteAllUnits = async () => {
    setConfirmDeleteAllUnits(false);
    if (!project) return;
    setRemovingBook(true);
    try {
      const res = await removeBookFromTranslation(id, project.source_book);
      toast.show(t.unitsDeleted(res.deleted), { type: "success" });
      setSelectedChapter(null);
      await reloadSummary();
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
      await reloadSummary();
    } catch {
      /* ignore */
    } finally {
      setAddingBook(false);
    }
  };

  const handleMemberAction = async (membershipId: string, action: "approved" | "rejected" | "remove") => {
    setConfirmMemberAction(null);
    setActionBusy(`member-${membershipId}`);
    try {
      if (action === "remove") {
        await removeMember(id, membershipId);
      } else {
        await updateMembershipStatus(id, membershipId, action);
      }
      const m = await fetchMembers(id);
      setMembers(m);
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleOpenProjectSettings = async () => {
    setEditingProject(true);
    if (translationLanguages.length === 0) {
      fetchTranslationLanguages()
        .then(setTranslationLanguages)
        .catch(() => toast.show(ui.loadError, { type: "error" }));
    }
  };

  const handleSaveProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectNameDraft.trim() || !projectLanguageDraft || actionBusy) return;
    setActionBusy("project-settings");
    try {
      const updated = await updateTranslation(id, {
        name: projectNameDraft.trim(),
        description: projectDescriptionDraft.trim(),
        target_language: projectLanguageDraft,
      });
      setProject(updated);
      setEditingProject(false);
      toast.show(ui.projectUpdated, { type: "success" });
    } catch {
      toast.show(ui.updateFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeleteUnit = async () => {
    const unitId = confirmDeleteUnit;
    setConfirmDeleteUnit(null);
    if (!unitId) return;
    setActionBusy(`delete-unit-${unitId}`);
    try {
      await deleteTranslationUnit(id, unitId);
      setUnits((previous) => previous.filter((unit) => unit.id !== unitId));
      setUnitDrafts((previous) => {
        const next = { ...previous };
        delete next[unitId];
        return next;
      });
      await Promise.all([reloadSummary(), fetchTranslation(id).then(setProject)]);
      toast.show(ui.unitDeleted, { type: "success" });
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleOpenAddUnit = () => {
    setAddingUnit(true);
    if (project && unitChapters.length === 0) {
      fetchChapters(project.source_book)
        .then(setUnitChapters)
        .catch(() => toast.show(ui.loadError, { type: "error" }));
    }
  };

  const handleUnitChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chId = e.target.value;
    setUnitChapterId(chId);
    setUnitVerseId("");
    setUnitVerses([]);
    if (chId) {
      fetchVerses(chId)
        .then(setUnitVerses)
        .catch(() => toast.show(ui.loadError, { type: "error" }));
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitChapterId) return;
    setActionBusy("add-unit");
    try {
      if (unitVerseId) {
        const unit = await addTranslationUnit(id, unitVerseId);
        if (unit.chapter_number === selectedChapter) setUnits((prev) => [...prev, unit]);
      } else {
        const verses = unitVerses.length > 0 ? unitVerses : await fetchVerses(unitChapterId);
        setConfirmAddChapterVerses(verses);
        return;
      }
      setAddingUnit(false);
      await reloadSummary();
      setUnitChapterId("");
      setUnitVerseId("");
      setUnitVerses([]);
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleConfirmAddChapter = async () => {
    const verses = confirmAddChapterVerses;
    setConfirmAddChapterVerses(null);
    if (!verses) return;
    setActionBusy("add-unit");
    try {
      const results = await Promise.allSettled(verses.map((verse) => addTranslationUnit(id, verse.id)));
      const added = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      setUnits((prev) => [
        ...prev,
        ...added.filter((unit) => unit.chapter_number === selectedChapter),
      ]);
      if (added.length !== verses.length) toast.show(ui.actionFailed, { type: "error" });
      setAddingUnit(false);
      await reloadSummary();
      setUnitChapterId("");
      setUnitVerseId("");
      setUnitVerses([]);
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleAssignUnit = async (unitId: string, userId: string) => {
    setActionBusy(`assign-${unitId}`);
    try {
      const updated = await assignTranslationUnit(id, unitId, userId || null);
      setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleUnitStatusChange = async (unitId: string, newStatus: TranslationUnit["status"]) => {
    setActionBusy(`status-${unitId}`);
    try {
      const updated = await updateTranslationUnit(id, unitId, { status: newStatus });
      setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
      setReviewUnits((prev) => prev.filter((u) => u.id !== unitId));
      const [, proj] = await Promise.all([reloadSummary(), fetchTranslation(id)]);
      setProject(proj);
    } catch {
      toast.show(ui.actionFailed, { type: "error" });
    } finally {
      setActionBusy(null);
    }
  };

  const handleSaveBody = async (unitId: string) => {
    const current = units.find((u) => u.id === unitId);
    if (!current) return;
    const body = unitDrafts[unitId] ?? current.body;
    setSavingUnit(unitId);
    setUnitErrors((previous) => ({ ...previous, [unitId]: "" }));
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
      toast.show(ui.unitSaved, { type: "success" });
    } catch {
      setUnitErrors((previous) => ({ ...previous, [unitId]: ui.unitSaveFailed }));
    } finally {
      setSavingUnit(null);
    }
  };

  const renderCommentBody = (body: string) => {
    const parts = body.split(/(@[\w]+)/g);
    return parts.map((p, i) =>
      p.startsWith("@") ? <strong key={i} className="text-accent">{p}</strong> : p
    );
  };

  const handleLoadUnitComments = async (unitId: string) => {
    if (expandedUnit === unitId) {
      setExpandedUnit(null);
      return;
    }
    setExpandedUnit(unitId);
    if (!unitComments[unitId]) {
      setUnitCommentsLoading(unitId);
      setUnitCommentErrors((previous) => ({ ...previous, [unitId]: "" }));
      try {
        const cs = await fetchUnitComments(id, unitId);
        setUnitComments((prev) => ({ ...prev, [unitId]: cs }));
      } catch {
        setUnitCommentErrors((previous) => ({ ...previous, [unitId]: ui.loadError }));
      } finally {
        setUnitCommentsLoading(null);
      }
    }
  };

  const handlePostUnitComment = async (unitId: string) => {
    const body = unitCommentBody[unitId]?.trim();
    if (!body) return;
    try {
      const c = await postUnitComment(id, unitId, body);
      setUnitComments((prev) => ({ ...prev, [unitId]: [c, ...(prev[unitId] ?? [])] }));
      setUnitCommentBody((prev) => ({ ...prev, [unitId]: "" }));
    } catch {
      setUnitCommentErrors((previous) => ({ ...previous, [unitId]: ui.commentFailed }));
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <SkeletonList count={4} />
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", textAlign: "center" }} role="alert">
        <p className="text-muted">{ui.loadError}</p>
        <Button variant="secondary" onClick={() => void loadProject()}>{ui.retry}</Button>
      </div>
    );
  }
  if (!project) return <div className="p-8 text-muted">{t.noProjects}</div>;

  const progressPct = project.unit_count > 0
    ? Math.round((project.done_count / project.unit_count) * 100)
    : 0;
  const progressText = project.unit_count > 0
    ? `${project.done_count}/${project.unit_count} (${progressPct}%)`
    : `${project.done_count}/${project.unit_count}`;
  // レビュー件数は表示中の章ではなく企画全体の数（summary）から出す。
  const reviewCount = summary?.status_counts.review ?? 0;

  const tabLabel = (tabKey: "units" | "review" | "members") => {
    if (tabKey === "units") return t.units;
    if (tabKey === "review") {
      return `${t.review}${reviewCount > 0 ? ` (${reviewCount})` : ""}`;
    }
    return t.members;
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>
      <div className="mb-2">
        <Link href="/translations" onClick={guardNavigation} className="text-sm text-muted no-underline">
          {t.backToTranslations}
        </Link>
      </div>

      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-1 mt-0 mx-0 mb-1">
            <h1 className="text-xl font-bold m-0">{project.name}</h1>
            {user && (
              <BookmarkStar
                active={!!projectBookmark}
                busy={projectBusy}
                onToggle={toggleProjectBookmark}
                size={18}
              />
            )}
          </div>
          <div className="text-sm text-muted">
            {project.source_book_name} → {languageLabel(project.target_language)} ／ {t.createdBy} {project.owner_username}
          </div>
        </div>

        {isOwner && (
          <div className="flex gap-2 flex-wrap">
            {project.status === "draft" && (
              <button disabled={!!actionBusy} onClick={() => setConfirmStatusAction("activate")} className="chip-btn">
                {t.startRecruiting}
              </button>
            )}
            {project.status === "active" && (
              <button disabled={!!actionBusy} onClick={() => setConfirmStatusAction("publish")} className="chip-btn">
                {t.publish}
              </button>
            )}
            {project.status === "published" && (
              <button disabled={!!actionBusy} onClick={() => setConfirmStatusAction("unpublish")} className="chip-btn chip-btn-danger">
                {t.unpublish}
              </button>
            )}
            <button disabled={!!actionBusy} onClick={() => void handleOpenProjectSettings()} className="chip-btn chip-btn-neutral">
              {ui.projectSettings}
            </button>
            <button disabled={!!actionBusy} onClick={() => setConfirmDelete(true)} className="chip-btn chip-btn-danger">
              {t.delete}
            </button>
          </div>
        )}

        {user && !isOwner && project.membership_status === null && project.status === "active" && (
          <button disabled={actionBusy === "join"} onClick={handleJoin} className="chip-btn">{t.applyMembership}</button>
        )}
        {user && !isOwner && project.membership_status === "rejected" && project.status === "active" && (
          <button disabled={actionBusy === "join"} onClick={handleJoin} className="chip-btn">{ui.reapply}</button>
        )}
        {user && !isOwner && project.membership_status === null && project.status !== "active" && project.status !== "published" && (
          <span
            className="inline-flex items-center text-xs text-muted bg-bg-alt border border-border rounded-full py-1 px-3"
          >
            {t.notRecruiting}
          </span>
        )}
        {project.status === "published" && (
          <Link href={`/translations/${id}/read`} onClick={guardNavigation} className="chip-btn">
            {t.readTranslation}
          </Link>
        )}
        {user && project.status === "published" && (
          <button
            onClick={handleToggleLibrary}
            className={inLibrary ? "chip-btn chip-btn-neutral" : "chip-btn"}
          >
            {inLibrary ? t.removeFromLibrary : t.addToLibrary}
          </button>
        )}
      </div>

      {project.membership_status === "pending" && !isOwner && (
        <p role="status" style={{ padding: "10px 12px", border: "1px solid var(--state-warning)", borderRadius: 8, color: "var(--text-muted)", background: "rgba(245,158,11,0.10)" }}>
          {ui.applicationPending}
        </p>
      )}
      {project.membership_status === "rejected" && !isOwner && (
        <p role="status" className="py-3 px-3 border border-border rounded-md text-muted">
          {ui.applicationRejected}
        </p>
      )}

      {editingProject && isOwner && (
        <form onSubmit={handleSaveProject} className="card mb-4 grid gap-3" >
          <h2 className="m-0 text-md">{ui.projectSettings}</h2>
          <label htmlFor="translation-project-name" className="grid gap-2 text-sm text-muted">
            {t.projectName}
            <input
              id="translation-project-name"
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              required
              maxLength={200}
              className="form-control"
            />
          </label>
          <label htmlFor="translation-project-description" className="grid gap-2 text-sm text-muted">
            {t.description}
            <textarea
              id="translation-project-description"
              value={projectDescriptionDraft}
              onChange={(event) => setProjectDescriptionDraft(event.target.value)}
              rows={4}
              className="form-control resize-y"
            />
          </label>
          <label htmlFor="translation-project-language" className="grid gap-2 text-sm text-muted">
            {t.targetLanguage}
            <select
              id="translation-project-language"
              value={projectLanguageDraft}
              onChange={(event) => setProjectLanguageDraft(event.target.value)}
              required
              className="form-control"
            >
              {(translationLanguages.length > 0
                ? translationLanguages
                : [{ id: project.target_language, tag: project.target_language, label: languageLabel(project.target_language), order: 0 }]
              ).map((language) => <option key={language.id} value={language.tag}>{language.label}</option>)}
            </select>
            <span className="text-xs text-faint">{ui.targetLanguageHelp}</span>
          </label>
          <p className="m-0 text-xs leading-base text-muted">{ui.licenseNotice}</p>
          <div className="flex justify-end gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => setEditingProject(false)}>{t.cancel}</Button>
            <Button type="submit" variant="secondary" loading={actionBusy === "project-settings"}>{ui.saveSettings}</Button>
          </div>
        </form>
      )}

      {project.description && (
        <p className="text-sm text-muted leading-base mb-4">
          {project.description}
        </p>
      )}

      <div className="stat-grid">
        <div className="stat-item">
          <span className="stat-label">{t.status}</span>
          <strong className="stat-value">{projectStatusLabel(project.status)}</strong>
        </div>
        <div className="stat-item">
          <span className="stat-label">{t.progress}</span>
          <strong className="stat-value">{progressText}</strong>
          {summary && (
            <span className="block mt-1 text-faint text-xs">
              {unitStatusLabel("todo", t)} {summary.status_counts.todo} · {unitStatusLabel("in_progress", t)} {summary.status_counts.in_progress}
            </span>
          )}
          <div
            role="progressbar"
            aria-label={t.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            className="progress-track"
          >
            <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--accent)", borderRadius: 999, transition: "width 0.3s" }} />
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-label">{t.review}</span>
          <strong className="stat-value">{reviewCount}</strong>
        </div>
        <div className="stat-item">
          <span className="stat-label">{t.units}</span>
          <strong className="stat-value">{project.unit_count}</strong>
          {summary && user && <span className="block mt-1 text-faint text-xs">{ui.assignedToMe(summary.assigned_to_me)}</span>}
        </div>
      </div>

      {(isApprovedMember || project.status !== "published") && <div role="tablist" aria-label={t.translationsTitle} onKeyDown={handleHorizontalTabListKeyDown} className="flex border-b border-border mb-6 gap-0">
        {(["units", "review", "members"] as const).map((tabKey) => (
          <button
            type="button"
            key={tabKey}
            id={`translation-tab-${tabKey}`}
            role="tab"
            aria-selected={tab === tabKey}
            aria-controls={`translation-panel-${tabKey}`}
            tabIndex={tab === tabKey ? 0 : -1}
            onClick={() => changeTab(tabKey)}
            style={{
              minHeight: 44,
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
      </div>}

      {tab === "units" && (
        <div
          id="translation-panel-units"
          role="tabpanel"
          aria-labelledby={isApprovedMember || project.status !== "published" ? "translation-tab-units" : undefined}
          aria-label={!isApprovedMember && project.status === "published" ? t.units : undefined}
        >
          {isOwner && (
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <button
                disabled={addingBook || !!actionBusy}
                onClick={handleAddAllChapters}
                className="chip-btn"
              >
                {addingBook ? t.adding : t.addAllChapters}
              </button>
              <button
                disabled={removingBook || !!actionBusy}
                onClick={() => setConfirmDeleteAllUnits(true)}
                className="chip-btn chip-btn-danger"
              >
                {removingBook ? t.deleting : t.deleteAllUnits}
              </button>
              {!addingUnit ? (
                <button disabled={!!actionBusy} onClick={handleOpenAddUnit} className="chip-btn">
                  {t.addUnit}
                </button>
              ) : (
                <form onSubmit={handleAddUnit} className="flex gap-2 items-center flex-wrap">
                  <label className="grid gap-1 text-xs text-muted">
                    {ui.selectChapterLabel}
                    <select
                      value={unitChapterId}
                      onChange={handleUnitChapterChange}
                      className="py-2 px-3 tap-target border border-border rounded-md bg-bg-alt text-body text-sm"
                      required
                    >
                      <option value="">{t.selectChapter}</option>
                      {unitChapters.map((c) => (
                        <option key={c.id} value={c.id}>{c.number}</option>
                      ))}
                    </select>
                  </label>
                  {unitVerses.length > 0 && (
                    <label className="grid gap-1 text-xs text-muted">
                      {ui.selectVerseLabel}
                      <select
                        value={unitVerseId}
                        onChange={(e) => setUnitVerseId(e.target.value)}
                        style={{ padding: "8px 10px", minHeight: 44, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-alt)", color: "var(--text)", fontSize: 14 }}
                      >
                        <option value="">{t.addAllVerses}</option>
                        {unitVerses.map((v) => (
                          <option key={v.id} value={v.id}>{v.number}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {/* 未選択でも押せるようにする。select の required でブラウザが理由を出す。
                      押せなくすると、なぜ押せないのかが伝わらない。 */}
                  <button type="submit" disabled={actionBusy === "add-unit"} className="chip-btn">{t.add}</button>
                  <button
                    type="button"
                    onClick={() => { setAddingUnit(false); setUnitChapterId(""); setUnitVerseId(""); setUnitVerses([]); }}
                    className="chip-btn chip-btn-neutral"
                  >
                    {t.cancel}
                  </button>
                </form>
              )}
            </div>
          )}

          {selectedChapter === null && (
            (summary?.total ?? 0) === 0 ? (
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
                {(summary?.chapters ?? []).map((chNum) => (
                  (() => {
                    const chapterSummary = summary?.chapter_summaries?.find((chapter) => chapter.number === chNum);
                    const done = chapterSummary?.status_counts.done ?? 0;
                    const total = chapterSummary?.total ?? 0;
                    return (
                  <button
                    key={chNum}
                    onClick={() => changeChapter(chNum)}
                    aria-label={`${t.chapterFmt(chNum)} ${ui.chapterProgress(done, total)}`}
                    className="card-glow card-glow-interactive"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 48,
                      color: "var(--text)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    <span>{chNum}</span>
                    {total > 0 && <span className="text-xs text-muted font-bold">{ui.chapterProgress(done, total)}</span>}
                  </button>
                    );
                  })()
                ))}
              </div>
            )
          )}

          {selectedChapter !== null && (
            <div>
              <button
                onClick={() => changeChapter(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 0 12px", display: "block" }}
              >
                {t.backToChapters}
              </button>
              <h3 className="text-md font-bold mb-3 pb-2 border-b border-border">{t.chapterFmt(selectedChapter)}</h3>
              <div className="flex gap-3 flex-wrap mb-4">
                <label className="grid gap-1 text-xs text-muted">
                  {ui.filterStatus}
                  <select
                    value={unitStatusFilter}
                    onChange={(event) => {
                      const value = event.target.value as typeof unitStatusFilter;
                      if (hasUnsavedUnits) setPendingDiscardNavigation({ kind: "status-filter", value });
                      else setUnitStatusFilter(value);
                    }}
                    className="filter-select"
                  >
                    <option value="all">{ui.allStatuses}</option>
                    <option value="todo">{unitStatusLabel("todo", t)}</option>
                    <option value="in_progress">{unitStatusLabel("in_progress", t)}</option>
                    <option value="review">{unitStatusLabel("review", t)}</option>
                    <option value="done">{unitStatusLabel("done", t)}</option>
                  </select>
                </label>
                {user && (
                  <label className="grid gap-1 text-xs text-muted">
                    {ui.filterAssignee}
                    <select
                      value={unitAssigneeFilter}
                      onChange={(event) => {
                        const value = event.target.value as typeof unitAssigneeFilter;
                        if (hasUnsavedUnits) setPendingDiscardNavigation({ kind: "assignee-filter", value });
                        else setUnitAssigneeFilter(value);
                      }}
                      className="filter-select"
                    >
                      <option value="all">{ui.allUnits}</option>
                      <option value="me">{ui.myUnits}</option>
                    </select>
                  </label>
                )}
              </div>
              {unitsLoading && <SkeletonList count={3} />}
              {!unitsLoading && units.length === 0 && <EmptyState title={ui.noUnitsInChapter} />}
              <div className="flex flex-col gap-2">
              {/* units はこの章の分だけ取ってあるので、ここでの絞り込みは不要 */}
              {units.map((unit) => (
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
                  <div className="py-3 px-4">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <div className="text-xs text-muted flex-1 min-w-0">
                        {unit.chapter_number}:{unit.verse_number}
                        {unit.assigned_to_username && (
                          <span className="ml-2">{t.assignee} {unit.assigned_to_username}</span>
                        )}
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: STATUS_BADGE_STYLE[unit.status]?.bg ?? "var(--bg-hover)",
                          color: STATUS_BADGE_STYLE[unit.status]?.color ?? "var(--text-muted)",
                        }}
                      >
                        {unitStatusLabel(unit.status, t)}
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
                    <div className="compare-grid">
                      <div className="sub-card">
                        <div className="col-label">{t.sourceText}</div>
                        <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--text)", fontStyle: "italic", lineHeight: 1.7, fontFamily: '"Noto Serif JP", serif' }}>
                          {unit.verse_text}
                        </p>
                      </div>
                      <div className="sub-card">
                        <label htmlFor={`translation-body-${unit.id}`} className="col-label">{t.translationText}</label>
                        {canEdit ? (
                          // 訳文欄は常時編集可能。「訳文編集」ボタンを押さずに直接入力できる。
                          <textarea
                            id={`translation-body-${unit.id}`}
                            value={draft}
                            onChange={(e) => setUnitDrafts((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                            rows={5}
                            placeholder={t.translationPlaceholder}
                            style={{ flex: 1, width: "100%", minHeight: 96, marginTop: 6, padding: 0, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6, outline: "none" }}
                          />
                        ) : unit.body ? (
                          <p className="mt-2 mx-0 mb-0 text-sm leading-base">{unit.body}</p>
                        ) : (
                          <p className="mt-2 mx-0 mb-0 text-sm text-faint">{t.notTranslatedYet}</p>
                        )}
                      </div>
                    </div>

                    {dirty && <p role="status" className="mt-2 mx-0 mb-0 text-warning text-xs">{ui.unsavedBadge}</p>}
                    {unitErrors[unit.id] && <p role="alert" className="mt-2 mx-0 mb-0 text-danger text-xs">{unitErrors[unit.id]}</p>}

                    {canEdit && (
                      // 元テキスト側の下に担当者/ステータス、訳文側の下に保存ボタン（画像の構成に合わせる）。
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
                        <div className="flex gap-3 flex-wrap items-end">
                          {isOwner && (
                            <label className="flex flex-col min-w-0">
                              <span className="field-label">{t.assigneeLabel}</span>
                              <select
                                value={unit.assigned_to ?? ""}
                                onChange={(e) => handleAssignUnit(unit.id, e.target.value)}
                                disabled={actionBusy === `assign-${unit.id}`}
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
                            <label className="flex flex-col min-w-0">
                              <span className="field-label">{t.statusFieldLabel}</span>
                              <select
                                value={unit.status}
                                onChange={(e) => handleUnitStatusChange(unit.id, e.target.value as TranslationUnit["status"])}
                                disabled={actionBusy === `status-${unit.id}`}
                                style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-alt)", color: "var(--text)", fontSize: 12 }}
                              >
                                <option value="todo">{t.statusPending}</option>
                                <option value="in_progress">{t.statusInProgress}</option>
                                <option value="review">{t.statusInReview}</option>
                              </select>
                            </label>
                          )}
                          {isOwner && unit.status === "done" && (
                            <button disabled={actionBusy === `status-${unit.id}`} onClick={() => setConfirmSendBackUnit(unit.id)} className="chip-btn chip-btn-warning">
                              {t.sendBack}
                            </button>
                          )}
                        </div>
                        <div className="flex justify-end items-start">
                          {/* 未保存の変更があるときだけ押せる。 */}
                          <button
                            onClick={() => handleSaveBody(unit.id)}
                            disabled={saving || !dirty}
                            className="chip-btn"
                          >
                            {saving ? t.saving : t.save}
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUnit(unit.id)}
                              disabled={actionBusy === `delete-unit-${unit.id}`}
                              className="chip-btn chip-btn-danger ml-2"
                            >
                              {ui.deleteUnit}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    </>
                      );
                    })()}
                  </div>

                  <div className="border-t border-border py-2 px-4">
                    <button
                      onClick={() => handleLoadUnitComments(unit.id)}
                      aria-expanded={expandedUnit === unit.id}
                      aria-controls={`unit-discussion-${unit.id}`}
                      style={{ minHeight: 44, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, padding: "4px 0" }}
                    >
                      {expandedUnit === unit.id ? t.closeDiscussion : t.openDiscussion}
                      {unitComments[unit.id]?.length ? ` (${unitComments[unit.id].length})` : ""}
                    </button>
                    {expandedUnit === unit.id && (
                      <div id={`unit-discussion-${unit.id}`} className="mt-2">
                        {unitCommentsLoading === unit.id && <p className="text-muted text-xs">{t.loading}</p>}
                        {unitCommentErrors[unit.id] && <p role="alert" className="text-xs text-danger">{unitCommentErrors[unit.id]}</p>}
                        {unitCommentsLoading !== unit.id && !unitCommentErrors[unit.id] && (unitComments[unit.id] ?? []).length === 0 && (
                          <p className="text-xs text-faint">{ui.noDiscussion}</p>
                        )}
                        {(unitComments[unit.id] ?? []).map((c) => (
                          <div key={c.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                            <span className="font-bold">{c.username}</span>
                            <span className="text-faint text-xs ml-2">{formatRelativeTime(c.created_at)}</span>
                            <p style={{ margin: "2px 0 0", color: c.is_deleted ? "var(--text-faint)" : "inherit" }}>
                              {c.is_deleted ? c.display_body : renderCommentBody(c.display_body)}
                            </p>
                          </div>
                        ))}
                        {isApprovedMember && (
                          <MentionInput
                            value={unitCommentBody[unit.id] ?? ""}
                            onChange={(v) => setUnitCommentBody((prev) => ({ ...prev, [unit.id]: v }))}
                            onSubmit={() => handlePostUnitComment(unit.id)}
                            members={members.filter((m) => m.status === "approved").map((m) => m.username)}
                            placeholder={ui.mentionPlaceholder}
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
        <ReviewTab
          units={reviewUnits}
          loading={reviewLoading}
          isOwner={isOwner}
          actionBusy={actionBusy}
          onOpenTarget={handleOpenReviewTarget}
          onSendBack={setConfirmSendBackUnit}
          onApprove={setConfirmApproveUnit}
        />
      )}

      {tab === "members" && (
        <MembersTab
          members={members}
          loading={membersLoading}
          isApprovedMember={isApprovedMember}
          isOwner={isOwner}
          actionBusy={actionBusy}
          onApprove={(id) => void handleMemberAction(id, "approved")}
          onReject={(id) => setConfirmMemberAction({ id, action: "rejected" })}
          onRemove={(id) => setConfirmMemberAction({ id, action: "remove" })}
        />
      )}

      <ConfirmDialog
        open={pendingDiscardNavigation !== null}
        title={ui.unsavedWarning}
        confirmText={ui.discardAndContinue}
        destructive
        onConfirm={handleConfirmDiscardNavigation}
        onCancel={() => setPendingDiscardNavigation(null)}
      />
      <ConfirmDialog
        open={confirmAddChapterVerses !== null}
        title={ui.addChapterConfirm(confirmAddChapterVerses?.length ?? 0)}
        confirmText={ui.addChapterAction}
        onConfirm={() => void handleConfirmAddChapter()}
        onCancel={() => setConfirmAddChapterVerses(null)}
      />
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
      <ConfirmDialog
        open={confirmSendBackUnit !== null}
        title={ui.confirmSendBack}
        description={ui.confirmSendBackDesc}
        confirmText={t.sendBack}
        onConfirm={() => {
          const unitId = confirmSendBackUnit;
          setConfirmSendBackUnit(null);
          if (unitId) void handleUnitStatusChange(unitId, "in_progress");
        }}
        onCancel={() => setConfirmSendBackUnit(null)}
      />
      <ConfirmDialog
        open={confirmStatusAction !== null}
        title={
          confirmStatusAction === "activate"
            ? ui.confirmActivate
            : confirmStatusAction === "publish"
              ? ui.confirmPublish
              : ui.confirmUnpublish
        }
        description={
          confirmStatusAction === "activate"
            ? ui.confirmActivateDesc
            : confirmStatusAction === "publish"
              ? ui.confirmPublishDesc
              : ui.confirmUnpublishDesc
        }
        confirmText={
          confirmStatusAction === "activate"
            ? t.startRecruiting
            : confirmStatusAction === "publish"
              ? t.publish
              : t.unpublish
        }
        destructive={confirmStatusAction === "unpublish"}
        onConfirm={() => {
          if (confirmStatusAction) void handleStatusChange(confirmStatusAction);
        }}
        onCancel={() => setConfirmStatusAction(null)}
      />
      <ConfirmDialog
        open={confirmMemberAction !== null}
        title={confirmMemberAction?.action === "rejected" ? ui.confirmRejectMember : ui.confirmRemoveMember}
        confirmText={confirmMemberAction?.action === "rejected" ? t.reject : t.kick}
        destructive
        onConfirm={() => {
          if (confirmMemberAction) void handleMemberAction(confirmMemberAction.id, confirmMemberAction.action);
        }}
        onCancel={() => setConfirmMemberAction(null)}
      />
      <ConfirmDialog
        open={confirmDeleteUnit !== null}
        title={ui.confirmDeleteUnit}
        description={ui.confirmDeleteUnitDesc}
        confirmText={ui.deleteUnit}
        destructive
        onConfirm={() => void handleDeleteUnit()}
        onCancel={() => setConfirmDeleteUnit(null)}
      />
    </div>
  );
}

// resume バッジ風の淡いピル。色相で役割を残しつつ統一感を出す。
// 緑(success)は統一感のためアクセント紫に寄せる。
type PendingDiscardNavigation =
  | { kind: "tab"; value: "units" | "review" | "members" }
  | { kind: "chapter"; value: number | null }
  | { kind: "href"; value: string }
  | { kind: "review-target"; value: { chapter: number; unitId: string } }
  | { kind: "status-filter"; value: "all" | TranslationUnit["status"] }
  | { kind: "assignee-filter"; value: "all" | "me" };

