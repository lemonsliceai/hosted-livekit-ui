import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app sits inside the package and depends on it through file:..
  // The trace root has to include that package, or a deploy drops it.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
