import type { NextConfig } from "next";

import { getBasePath } from "./src/lib/basePath";

const nextConfig: NextConfig = {
  // Single source of truth for the deployment base path: NEXT_PUBLIC_BASE_PATH.
  // Empty means hosted at the domain root; any other value is a subpath such
  // as "/example". See src/lib/basePath.ts for normalization rules.
  basePath: getBasePath(),
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
