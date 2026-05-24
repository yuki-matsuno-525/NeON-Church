"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTranslation, fetchBooks, fetchTranslationLanguages, type Book, type TranslationLanguage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { BIBLE_TRANSLATIONS } from "@/lib/translations";

export default function NewTranslationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useT();
  const [books, setBooks] = useState<Book[]>([]);
  const [languages, setLanguages] = useState<TranslationLanguage[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceVersion, setSourceVersion] = useState(BIBLE_TRANSLATIONS[0]?.id ?? "");
  const [sourceBook, setSourceBook] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTranslationLanguages().then(setLanguages).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sourceVersion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSourceBook("");
    fetchBooks(sourceVersion).then(setBooks).catch(() => {});
  }, [sourceVersion]);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourceBook || !targetLanguage) return;
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
          <label style={labelStyle}>{t.projectName}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projectNamePlaceholder}
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>{t.description}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descPlaceholder}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div>
          <label style={labelStyle}>{t.bibleVersion}</label>
          <select
            value={sourceVersion}
            onChange={(e) => setSourceVersion(e.target.value)}
            style={inputStyle}
            required
          >
            {BIBLE_TRANSLATIONS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>{t.sourceBook}</label>
          <select
            value={sourceBook}
            onChange={(e) => setSourceBook(e.target.value)}
            style={inputStyle}
            required
          >
            <option value="">{t.selectBookOption}</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>{t.targetLanguage}</label>
          <select
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
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: 8,
              padding: "10px",
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? t.creating : t.createProject}
          </button>
          <Link
            href="/translations"
            style={{
              padding: "10px 20px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              color: "var(--text-muted)",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {t.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
