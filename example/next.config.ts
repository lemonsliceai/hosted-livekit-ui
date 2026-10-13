import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app sits inside the package, so Next sees two lockfiles and can guess the wrong
  // root. Pin it to this directory.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
