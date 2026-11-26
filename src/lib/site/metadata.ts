import type { Metadata } from "next";

export const SITE_TITLE = "unpolished vol.1 - sample pack by 99stud";

export const SITE_DESCRIPTION =
  "unpolished vol.1 by 99stud: 59 WAV samples across drums, bass, loops and one-shots.";

/*
 * A page's nested metadata objects (`openGraph`, `robots`) replace its
 * layout's instead of merging with them. The two below are shared so that a
 * page changing one field can repeat the rest.
 */

/** The images are not listed: they come from the `opengraph-image` file. */
export const OPEN_GRAPH = {
  type: "website",
  siteName: "unpolished",
  locale: "en_US",
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
} satisfies Metadata["openGraph"];

/** Robots directives for a page that must stay out of search engines. */
export const NO_INDEX_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
} satisfies Metadata["robots"];
