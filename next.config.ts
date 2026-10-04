import type { NextConfig } from "next";
import { log } from "node:console";

log("NODE_ENV:", process.env.NODE_ENV);
log("node", process.version);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
