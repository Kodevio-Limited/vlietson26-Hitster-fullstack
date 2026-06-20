import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['167.99.40.174'],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
