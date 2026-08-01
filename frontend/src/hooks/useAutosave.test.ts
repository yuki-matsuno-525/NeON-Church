import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "./useAutosave";

describe("useAutosave", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not save the initial value and saves a changed value after the delay", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 500 }),
      { initialProps: { value: "initial" } },
    );

    expect(onSave).not.toHaveBeenCalled();
    rerender({ value: "changed" });
    expect(result.current.isDirty).toBe(true);

    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(onSave).toHaveBeenCalledWith("changed");
    expect(result.current.status).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("reports a successful save after Strict Mode replays its effects", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 500 }),
      { initialProps: { value: "initial" }, wrapper },
    );

    rerender({ value: "changed" });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(onSave).toHaveBeenCalledWith("changed");
    expect(result.current.status).toBe("saved");
  });

  it("flushes the latest value immediately before navigation", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 10_000 }),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "latest" });
    await act(async () => { expect(await result.current.saveNow()).toBe(true); });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("latest");
    expect(result.current.isDirty).toBe(false);
  });

  it("keeps failed data dirty and retries it", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 10_000 }),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "unsaved" });
    await act(async () => { expect(await result.current.saveNow()).toBe(false); });
    expect(result.current.status).toBe("error");
    expect(result.current.isDirty).toBe(true);

    await act(async () => { expect(await result.current.retry()).toBe(true); });
    expect(onSave).toHaveBeenLastCalledWith("unsaved");
    expect(result.current.status).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("warns before a browser exit while changes are dirty", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 10_000 }),
      { initialProps: { value: "initial" } },
    );
    rerender({ value: "dirty" });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
