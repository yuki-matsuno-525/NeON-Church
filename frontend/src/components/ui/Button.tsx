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

const sizeStyles: Record<Size, { padding: string; fontSize: number; radius: number }> = {
  sm: { padding: "5px 12px", fontSize: 12, radius: 6 },
  md: { padding: "9px 16px", fontSize: 14, radius: 8 },
};

function variantStyles(variant: Variant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: "linear-gradient(135deg, #7618c5, #d81e80)",
        color: "#fff",
        border: "none",
        boxShadow: "0 0 14px rgba(198, 44, 170, 0.40)",
      };
    case "secondary":
      return {
        background: "var(--accent)",
        color: "var(--accent-text)",
        border: "none",
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
      };
    case "destructive":
      return {
        background: "#b91c1c",
        color: "#fff",
        border: "none",
      };
  }
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    leftIcon,
    rightIcon,
    children,
    disabled,
    style,
    type = "button",
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const sz = sizeStyles[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: sz.padding,
        fontSize: sz.fontSize,
        borderRadius: sz.radius,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        transition: "opacity 0.15s",
        ...variantStyles(variant),
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner size={sz.fontSize} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
