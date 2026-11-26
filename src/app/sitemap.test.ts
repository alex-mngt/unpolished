import { afterEach, describe, expect, test, vi } from "vitest";

import sitemap from "./sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sitemap.xml", () => {
  test("lists only the landing page once indexing is allowed", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    vi.stubEnv("SITE_URL", "https://unpolished.example");

    expect(sitemap()).toEqual([{ url: "https://unpolished.example/" }]);
  });

  test("lists nothing while the site is private", () => {
    vi.stubEnv("ALLOW_INDEXING", undefined);
    vi.stubEnv("SITE_URL", "https://unpolished.example");

    expect(sitemap()).toEqual([]);
  });
});
