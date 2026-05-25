"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  /** label を sr-only にする */
  labelHidden?: boolean;
};

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, hint, error, labelHidden, style, ...rest },
  ref
) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        className={labelHidden ? "sr-only" : undefined}
        style={
          labelHidden
            ? undefined
            : {
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-muted)",
              }
        }
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={{
          padding: "9px 12px",
          border: `1px solid ${error ? "#ef4444" : "var(--border)"}`,
          borderRadius: 8,
          background: "rgba(255, 255, 255, 0.05)",
          color: "var(--text)",
          fontSize: 14,
          fontFamily: "inherit",
          ...style,
        }}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} style={{ margin: 0, fontSize: 12, color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{ margin: 0, fontSize: 12, color: "#ef4444" }}
        >
          {error}
        </p>
      )}
    </div>
  );
});
