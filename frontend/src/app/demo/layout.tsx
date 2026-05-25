import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 56,
          right: 0,
          zIndex: 9999,
          background: "var(--state-warning)",
          color: "#000",
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 10px",
          letterSpacing: "0.08em",
          borderRadius: "0 0 0 6px",
          pointerEvents: "none",
        }}
      >
        DEMO
      </div>
      {children}
    </>
  );
}
