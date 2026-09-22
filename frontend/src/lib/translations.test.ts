import { describe, it, expect } from "vitest";
import { KNOWN_TRANSLATIONS, SOURCED_TRANSLATIONS, translationSource } from "./translations";

describe("translationSource", () => {
  it("登録してある訳はすべて出典を持つ（ライセンスページから漏れない）", () => {
    for (const id of KNOWN_TRANSLATIONS) {
      expect(translationSource(id), id).not.toBeNull();
    }
    expect([...SOURCED_TRANSLATIONS].sort()).toEqual([...KNOWN_TRANSLATIONS].sort());
  });

  it("出典には日英の説明と入手元の URL がある", () => {
    for (const id of SOURCED_TRANSLATIONS) {
      const source = translationSource(id)!;
      expect(source.work.ja && source.work.en, id).toBeTruthy();
      expect(source.license.ja && source.license.en, id).toBeTruthy();
      expect(source.origin.url, id).toMatch(/^https:\/\//);
    }
  });

  it("CC BY-SA のデータを使う訳は帰属先を書いている", () => {
    expect(translationSource("Nestle 1904 (GRC)")?.license.en).toContain("CC BY-SA 4.0");
  });

  it("七十人訳は電子データの非商用条件と CCAT を明記している", () => {
    const source = translationSource("LXX (GRC)")!;
    expect(source.license.ja).toContain("非商用");
    expect(source.license.ja).toContain("CCAT");
  });

  it("口語訳には初版をそのまま載せている旨の注記がある", () => {
    expect(translationSource("口語訳")?.note?.ja).toContain("改変せず");
  });

  it("未知の訳は null", () => {
    expect(translationSource("unknown")).toBeNull();
  });
});
