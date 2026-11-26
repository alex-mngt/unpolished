import { describe, expect, test } from "vitest";

import { readSiteConfig } from "./config";

describe("readSiteConfig", () => {
  test("keeps the site out of search engines unless ALLOW_INDEXING is exactly 'true'", () => {
    expect(readSiteConfig({}).indexable).toBe(false);
    expect(readSiteConfig({ ALLOW_INDEXING: "false" }).indexable).toBe(false);
    expect(readSiteConfig({ ALLOW_INDEXING: "1" }).indexable).toBe(false);
    expect(readSiteConfig({ ALLOW_INDEXING: "TRUE" }).indexable).toBe(false);
  });

  test("allows indexing when ALLOW_INDEXING is 'true' and the site URL is known", () => {
    const config = readSiteConfig({
      ALLOW_INDEXING: "true",
      SITE_URL: "https://unpolished.example",
    });

    expect(config.indexable).toBe(true);
    expect(config.url.href).toBe("https://unpolished.example/");
  });

  test("falls back to the local dev server when the site is private and SITE_URL is missing", () => {
    expect(readSiteConfig({}).url.href).toBe("http://localhost:3000/");
    expect(readSiteConfig({ SITE_URL: "  " }).url.href).toBe(
      "http://localhost:3000/",
    );
  });

  test("refuses to allow indexing without SITE_URL, so localhost URLs never reach a search engine", () => {
    expect(() => readSiteConfig({ ALLOW_INDEXING: "true" })).toThrow(
      /SITE_URL/,
    );
    expect(() =>
      readSiteConfig({ ALLOW_INDEXING: "true", SITE_URL: "" }),
    ).toThrow(/SITE_URL/);
  });

  test("names SITE_URL when its value is not a URL, such as an origin without a scheme", () => {
    expect(() => readSiteConfig({ SITE_URL: "unpolished.example" })).toThrow(
      /SITE_URL.*unpolished\.example/,
    );
  });
});
