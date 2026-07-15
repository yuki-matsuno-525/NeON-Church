"use client";

import type { CSSProperties } from "react";
import { useT } from "@/lib/i18n";

type ClearableSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  inputStyle?: CSSProperties;
  wrapperStyle?: CSSProperties;
};

export function ClearableSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputStyle,
  wrapperStyle,
}: ClearableSearchInputProps) {
  const t = useT();

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", ...wrapperStyle }}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        style={{
          ...inputStyle,
          paddingRight: value ? 38 : inputStyle?.paddingRight,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t.clearInput}
          style={clearButtonStyle}
        >
          &times;
        </button>
      )}
    </div>
  );
}

const clearButtonStyle: CSSProperties = {
  position: "absolute",
  right: 6,
  top: "50%",
  transform: "translateY(-50%)",
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  borderRadius: 4,
  fontFamily: "inherit",
};
