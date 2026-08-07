import { describe, expect, it } from "vitest";
import { buildCatalog, catalogBookIdParam } from "./bookCatalog";

const matthewBooks = [
  { id: "book-1", name: "マタイによる福音書", translation: "口語訳", order: 1 },
  { id: "book-2", name: "マタイによる福音書", translation: "KJV", order: 1 },
];

describe("book catalog", () => {
  it("DBの書を既知のslugと訳に対応付ける", () => {
    expect(buildCatalog([matthewBooks[0]])).toContainEqual({
      slug: "matthew",
      translations: [{ id: "口語訳", bookId: "book-1" }],
    });
  });

  it("訳を選んでいなければ、その書の全訳で絞る", () => {
    const catalog = buildCatalog(matthewBooks);
    expect(catalogBookIdParam(catalog, "matthew", "")?.split(",").sort()).toEqual(["book-1", "book-2"]);
    expect(catalogBookIdParam(catalog, "matthew", "KJV")).toBe("book-2");
    expect(catalogBookIdParam(catalog, "", "")).toBeUndefined();
  });
});
