import type { NextConfig } from "next";
import { log } from "node:console";

import { readSiteConfig } from "./src/lib/site/config.ts";

log("NODE_ENV:", process.env.NODE_ENV);
log("node", process.version);

const { indexable } = readSiteConfig();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.29"],
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        // Private site: nothing may be indexed. Public site: pages decide for
        // themselves through their metadata, but downloads stay out of search
        // results so they are only reached through the landing page.
        source: indexable ? "/:file(.+\\.zip)" : "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
