import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf2json", "mammoth"],
  experimental: {
    serverBodySizeLimit: "30mb",
  },
};

export default nextConfig;
