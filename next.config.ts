import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/send",
        destination: "/dashboard?action=send",
        permanent: false,
      },
      {
        source: "/request",
        destination: "/dashboard?action=request",
        permanent: false,
      },
      {
        source: "/add-money",
        destination: "/dashboard?action=add-money",
        permanent: false,
      },
      {
        source: "/history",
        destination: "/dashboard?action=history",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
