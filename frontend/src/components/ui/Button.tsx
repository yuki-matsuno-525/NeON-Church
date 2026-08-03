"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
};

/**
 * ボタンの見た目は globals.css の .btn / .btn-* が唯一の出どころ。
 * この部品は「読み込み中の表示」「アイコンの配置」「押せない状態」だけを受け持つ。
 *
 * 以前はグラデーションや文字サイズをこのファイルにも書いていたため、
 * globals.css 側だけを直すと <Link className="btn btn-primary"> との
 * 見た目がずれる状態だった。定義を 1 か所に戻している。
 */
const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-destructive",
};

/** Spinner の大きさは文字サイズに合わせる（決定表の値） */
const spinnerSize: Record<Size, number> = { sm: 12, md: 14 };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    leftIcon,
    rightIcon,
    children,
    disabled,
    className,
    type = "button",
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const classes = ["btn", size === "sm" ? "btn-sm" : null, variantClass[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading ? <Spinner size={spinnerSize[size]} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
