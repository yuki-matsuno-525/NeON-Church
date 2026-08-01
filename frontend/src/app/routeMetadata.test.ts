import { describe, expect, it } from "vitest";
import { routeMetadata } from "./routeMetadata";

describe("route metadata coverage", () => {
  it("covers every route whose page is a client component", () => {
    expect(Object.keys(routeMetadata).sort()).toEqual([
      "article",
      "articles",
      "bookmarks",
      "demo",
      "editArticle",
      "forgotPassword",
      "login",
      "newArticle",
      "newTranslation",
      "notifications",
      "profile",
      "qa",
      "read",
      "register",
      "resetPassword",
      "search",
      "settings",
      "translationChapter",
      "translationProject",
      "translationReader",
      "translations",
    ]);
  });

  it("defines a non-empty title and description for every client-page route", () => {
    for (const [route, metadata] of Object.entries(routeMetadata)) {
      expect(metadata.title, `${route} title`).toEqual(expect.any(String));
      expect(String(metadata.title).trim(), `${route} title`).not.toBe("");
      expect(metadata.description, `${route} description`).toEqual(expect.any(String));
      expect(metadata.description?.trim(), `${route} description`).not.toBe("");
    }
  });

  it("keeps account-specific and editing routes out of search indexes", () => {
    for (const route of [
      "newArticle",
      "editArticle",
      "bookmarks",
      "forgotPassword",
      "login",
      "notifications",
      "profile",
      "register",
      "resetPassword",
      "search",
      "settings",
      "newTranslation",
      "demo",
    ] as const) {
      expect(routeMetadata[route].robots).toEqual({ index: false, follow: false });
    }
  });
});
