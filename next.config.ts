import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images served from your Supabase storage domain.
  // Use `remotePatterns` to restrict allowed external image URLs.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "irakcudufmjlwllpediw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
