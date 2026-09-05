import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";

const unexpectedFetch = vi.fn((input: RequestInfo | URL) =>
  Promise.reject(
    new Error(`Unexpected network request in unit test: ${String(input)}`),
  ),
);

// Unit tests must be hermetic. Individual tests that exercise HTTP behavior
// replace this guard with an explicit mock in their own module or hook.
globalThis.fetch = unexpectedFetch as typeof fetch;

afterEach(() => {
  const requestedUrls = unexpectedFetch.mock.calls.map(([input]) => String(input));
  unexpectedFetch.mockClear();

  if (requestedUrls.length > 0) {
    throw new Error(
      `Unexpected network requests in unit test:\n${requestedUrls.join("\n")}`,
    );
  }
});
