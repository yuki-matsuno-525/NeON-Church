import type { KeyboardEvent } from "react";

/** Keyboard behavior shared by horizontal ARIA tablists. */
export function handleHorizontalTabListKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
  );
  if (tabs.length === 0) return;
  const current = tabs.indexOf(document.activeElement as HTMLElement);
  let next = current < 0 ? 0 : current;
  if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else if (event.key === "ArrowLeft") next = (next - 1 + tabs.length) % tabs.length;
  else next = (next + 1) % tabs.length;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}
