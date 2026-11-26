type Env = Record<string, string | undefined>;

export interface SiteConfig {
  /** Whether search engines may index the site. */
  indexable: boolean;
  /** Origin the site is served from, the base of every absolute URL it emits. */
  url: URL;
}

const LOCAL_URL = "http://localhost:3000";

/**
 * Reads the indexing switch and the site origin from the environment.
 *
 * Indexing is off unless `ALLOW_INDEXING` is exactly `"true"`, so a deployment
 * that forgets the variable stays out of search engines. Turning it on without
 * `SITE_URL` throws: the canonical URL, the sitemap and the social image URLs
 * would otherwise point at localhost.
 *
 * Everything that reads this is built ahead of time (prerendered pages,
 * `robots.txt`, `sitemap.xml`, the headers of `next.config.ts`), so a changed
 * variable only takes effect on the next build.
 */
export const readSiteConfig = (env: Env = process.env): SiteConfig => {
  const indexable = env.ALLOW_INDEXING === "true";
  const siteUrl = env.SITE_URL?.trim();

  if (indexable && !siteUrl) {
    throw new Error(
      "ALLOW_INDEXING is 'true' but SITE_URL is not set. Set SITE_URL to the public origin of the site, e.g. https://example.com.",
    );
  }

  if (siteUrl && !URL.canParse(siteUrl)) {
    throw new Error(
      `SITE_URL is not a valid URL: "${siteUrl}". Use a full origin including the scheme, e.g. https://example.com.`,
    );
  }

  return { indexable, url: new URL(siteUrl || LOCAL_URL) };
};
