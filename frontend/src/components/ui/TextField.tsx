"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  /** label を sr-only にする */
  labelHidden?: boolean;
};

/**
 * 大きさ・余白・色は Tailwind のクラスで指定する。
 * クラス名の値は globals.css の @theme に登録した表から来ているので、
 * ここに 13px のような表にない値は書けない（書いてもクラスが作られない）。
 */
export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, hint, error, labelHidden, className, ...rest },
  ref
) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={labelHidden ? "sr-only" : "text-sm font-bold text-muted"}
      >
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          "px-3 py-2 rounded-md border bg-field text-body text-sm",
          error ? "border-danger" : "border-border",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="m-0 text-xs text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" aria-live="polite" className="m-0 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
