import type { MetadataRoute } from "next";

import { readSiteConfig } from "@/lib/site/config";

/**
 * Crawling is always allowed. While the site is private, the `noindex` meta
 * tag and `X-Robots-Tag` header keep it out of search engines, and a crawler
 * has to fetch a page to see them: a `Disallow` here would hide them and let
 * the bare URL be indexed anyway.
 */
export default function robots(): MetadataRoute.Robots {
  const { indexable, url } = readSiteConfig();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    ...(indexable && { sitemap: new URL("/sitemap.xml", url).href }),
  };
}
