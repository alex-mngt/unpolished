import type { MetadataRoute } from "next";

import { readSiteConfig } from "@/lib/site/config";

/** Only the landing page: `/sandbox` stays out of search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  const { indexable, url } = readSiteConfig();

  if (!indexable) return [];

  return [{ url: new URL("/", url).href }];
}
