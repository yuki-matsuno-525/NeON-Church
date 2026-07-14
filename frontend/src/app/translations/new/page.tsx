"use client";

import { useId, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTranslation, fetchTranslationLanguages, type TranslationLanguage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationLabel } from "@/lib/translations";
import { useBookCatalog, catalogEntry, groupCatalogByGenre } from "@/lib/bookCatalog";

export default function NewTranslationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const catalog = useBookCatalog();
  const nameId = useId();
  const descriptionId = useId();
  const versionId = useId();
  const genreFieldId = useId();
  const bookFieldId = useId();
  const languageId = useId();
  const errorId = useId();
  const [languages, setLanguages] = useState<TranslationLanguage[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // まず書（slug）を選び、次にその書が持つ訳（version）を選ぶ。
  const [genreFilter, setGenreFilter] = useState("");
  const [sourceSlug, setSourceSlug] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 元テキスト = 選んだ書 × 訳に対応する DB の Book id。
  const sourceBook =
    catalogEntry(catalog, sourceSlug)?.translations.find((tr) => tr.id === sourceVersion)?.bookId ?? "";

  const handleSlugChange = (slug: string) => {
    setSourceSlug(slug);
    // その書の最初の訳を既定で選ぶ。DB に実在する訳（カタログ）から選ばないと
    // sourceBook が引けず作成できないため、カタログ基準で既定値を決める。
    setSourceVersion(catalogEntry(catalog, slug)?.translations[0]?.id ?? "");
  };

  useEffect(() => {
    fetchTranslationLanguages().then(setLanguages).catch(() => {});
  }, []);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourceBook || !targetLanguage) {
      // 無言で止まると原因が分からないため、不足項目を明示する。
      setError(t.createMissingFields);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const project = await createTranslation({
        name: name.trim(),
        description: description.trim(),
        source_book: sourceBook,
        target_language: targetLanguage,
      });
      router.push(`/translations/${project.id}`);
    } catch {
      setError(t.createFailed);
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-alt)",
    color: "var(--text)",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: "var(--text-muted)",
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/translations" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          {t.backToTranslations}
        </Link>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{t.newTranslationTitle}</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label htmlFor={nameId} style={labelStyle}>{t.projectName} <span style={{ color: "var(--state-danger)" }} aria-hidden="true">*</span></label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projectNamePlaceholder}
            style={inputStyle}
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor={descriptionId} style={labelStyle}>{t.description}</label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descPlaceholder}
            rows={3}
            autoComplete="off"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div>
          {/* カテゴリを先に選ぶと、元書プルダウンがそのカテゴリの書に絞られる。 */}
          <label htmlFor={genreFieldId} style={labelStyle}>{t.searchKindBook}</label>
          <select
            id={genreFieldId}
            value={genreFilter}
            onChange={(e) => { setGenreFilter(e.target.value); handleSlugChange(""); }}
            style={inputStyle}
          >
            <option value="">{t.all}</option>
            {groupCatalogByGenre(catalog).map(({ genre }) => (
              <option key={genre} value={genre}>{t.genreNames[genre] ?? genre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={bookFieldId} style={labelStyle}>{t.sourceBook} <span style={{ color: "var(--state-danger)" }} aria-hidden="true">*</span></label>
          <select
            id={bookFieldId}
            value={sourceSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            style={inputStyle}
            required
          >
            <option value="">{t.selectBookOption}</option>
            {(genreFilter
              ? groupCatalogByGenre(catalog).find((g) => g.genre === genreFilter)?.entries ?? []
              : catalog
            ).map((e) => (
              <option key={e.slug} value={e.slug}>{bookLabel(e.slug, lang)?.name ?? e.slug}</option>
            ))}
          </select>
        </div>

        {sourceSlug && (
          <div>
            <label htmlFor={versionId} style={labelStyle}>{t.bibleVersion}</label>
            <select
              id={versionId}
              value={sourceVersion}
              onChange={(e) => setSourceVersion(e.target.value)}
              style={inputStyle}
              required
            >
              {(catalogEntry(catalog, sourceSlug)?.translations ?? []).map((tr) => (
                <option key={tr.id} value={tr.id}>{translationLabel(tr.id, lang)}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor={languageId} style={labelStyle}>{t.targetLanguage} <span style={{ color: "var(--state-danger)" }} aria-hidden="true">*</span></label>
          <select
            id={languageId}
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            style={inputStyle}
            required
          >
            <option value="">{t.selectLangOption}</option>
            {languages.map(({ id, tag, label }) => (
              <option key={id} value={tag}>{label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            style={{ color: "var(--state-danger)", fontSize: "var(--font-size-sm)", margin: 0 }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            {submitting ? t.creating : t.createProject}
          </button>
          <Link
            href="/translations"
            className="btn btn-ghost"
          >
            {t.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
