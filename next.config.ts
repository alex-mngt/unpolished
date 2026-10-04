import type { NextConfig } from "next";
import { log } from "node:console";

log("NODE_ENV:", process.env.NODE_ENV);
log("node", process.version);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
