import { afterEach, describe, expect, test, vi } from "vitest";

import robots from "./robots";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots.txt", () => {
  test("lets crawlers fetch every page while the site is private, so they can read its noindex", () => {
    vi.stubEnv("ALLOW_INDEXING", undefined);
    vi.stubEnv("SITE_URL", undefined);

    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/" } });
  });

  test("points crawlers at the sitemap once indexing is allowed", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    vi.stubEnv("SITE_URL", "https://unpolished.example");

    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://unpolished.example/sitemap.xml",
    });
  });
});
