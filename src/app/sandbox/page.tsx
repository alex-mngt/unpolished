import type { Metadata } from "next";

import { SandboxClient } from "@/components/Sandbox/SandboxClient";
import { NO_INDEX_ROBOTS } from "@/lib/site/metadata";

/** Never indexed, whatever the indexing switch says: only the landing page is. */
export const metadata: Metadata = {
  robots: NO_INDEX_ROBOTS,
};

const Sandbox = () => {
  return <SandboxClient />;
};

export default Sandbox;
