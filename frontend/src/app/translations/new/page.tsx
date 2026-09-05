"use client";

import { useCallback, useId, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTranslation, fetchTranslationLanguages, type TranslationLanguage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationLabel } from "@/lib/translations";
import { catalogEntry, groupCatalogByGenre } from "@/lib/bookCatalog";
import { useBookCatalogState } from "@/hooks/useBookCatalog";
import { Button, SkeletonList } from "@/components/ui";
import { Breadcrumb } from "@/components/list";
import { translationUiText } from "../translationUiText";

export default function NewTranslationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const ui = translationUiText(lang);
  const { catalog, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useBookCatalogState();
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
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState(false);

  // 元テキスト = 選んだ書 × 訳に対応する DB の Book id。
  const sourceBook =
    catalogEntry(catalog, sourceSlug)?.translations.find((tr) => tr.id === sourceVersion)?.bookId ?? "";

  const handleSlugChange = (slug: string) => {
    setSourceSlug(slug);
    // その書の最初の訳を既定で選ぶ。DB に実在する訳（カタログ）から選ばないと
    // sourceBook が引けず作成できないため、カタログ基準で既定値を決める。
    setSourceVersion(catalogEntry(catalog, slug)?.translations[0]?.id ?? "");
  };

  const loadLanguages = useCallback(() => {
    setLanguagesLoading(true);
    setLanguagesError(false);
    fetchTranslationLanguages()
      .then(setLanguages)
      .catch(() => setLanguagesError(true))
      .finally(() => setLanguagesLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetchTranslationLanguages()
      .then((items) => active && setLanguages(items))
      .catch(() => active && setLanguagesError(true))
      .finally(() => active && setLanguagesLoading(false));
    return () => { active = false; };
  }, []);

  if (authLoading) {
    return <div className="page page-narrow"><SkeletonList count={5} /></div>;
  }

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


  return (
    <div className="page page-narrow">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: t.translationsTitle, href: "/translations" },
            { label: t.newTranslationTitle },
          ]}
        />
      </div>
      <h1 className="text-lg font-bold mb-6">{t.newTranslationTitle}</h1>

      <div className="grid gap-2 mb-6">
        <p className="plain-card m-0 text-sm text-muted leading-base">{ui.lifecycleHelp}</p>
        <p className="plain-card m-0 text-sm text-muted leading-base">{ui.licenseNotice}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor={nameId} className="form-label">{t.projectName}</label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projectNamePlaceholder}
            className="form-control"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor={descriptionId} className="form-label">{t.description}</label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descPlaceholder}
            rows={3}
            autoComplete="off"
            className="form-control resize-y"
          />
        </div>

        <div>
          {/* カテゴリを先に選ぶと、元書プルダウンがそのカテゴリの書に絞られる。 */}
          <label htmlFor={genreFieldId} className="form-label">{t.searchKindBook}</label>
          <select
            id={genreFieldId}
            disabled={catalogLoading || catalogError}
            value={genreFilter}
            onChange={(e) => { setGenreFilter(e.target.value); handleSlugChange(""); }}
            className="form-control"
          >
            <option value="">{t.all}</option>
            {groupCatalogByGenre(catalog).map(({ genre }) => (
              <option key={genre} value={genre}>{t.genreNames[genre] ?? genre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={bookFieldId} className="form-label">{t.sourceBook}</label>
          <select
            id={bookFieldId}
            disabled={catalogLoading || catalogError}
            value={sourceSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="form-control"
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
            <label htmlFor={versionId} className="form-label">{t.bibleVersion}</label>
            <select
              id={versionId}
              value={sourceVersion}
              onChange={(e) => setSourceVersion(e.target.value)}
              className="form-control"
              required
            >
              {(catalogEntry(catalog, sourceSlug)?.translations ?? []).map((tr) => (
                <option key={tr.id} value={tr.id}>{translationLabel(tr.id, lang)}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor={languageId} className="form-label">{t.targetLanguage}</label>
          <select
            id={languageId}
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="form-control"
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
            className="text-danger text-sm m-0"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || languagesLoading || languagesError || catalogLoading || catalogError}
            className="btn btn-primary flex-1"
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
      {languagesLoading && <p role="status" className="text-sm text-muted">{t.loading}</p>}
      {catalogLoading && <p role="status" className="text-sm text-muted">{t.loading}</p>}
      {catalogError && (
        <div role="alert" className="mt-4">
          <p className="text-sm text-danger">{ui.loadError}</p>
          <Button variant="ghost" size="sm" onClick={retryCatalog}>{ui.retry}</Button>
        </div>
      )}
      {languagesError && (
        <div role="alert" className="mt-4">
          <p className="text-sm text-danger">{ui.loadError}</p>
          <Button variant="ghost" size="sm" onClick={loadLanguages}>{ui.retry}</Button>
        </div>
      )}
    </div>
  );
}
