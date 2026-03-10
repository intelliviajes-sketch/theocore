import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/intracore/agency/:id/:path*",
        destination: "/intranet/agency/:id/:path*",
        permanent: true,
      },
      {
        source: "/intracore/agency/:id",
        destination: "/intranet/agency/:id",
        permanent: true,
      },
      {
        source: "/intracore/:path*",
        destination: "/intranet/thecore/:path*",
        permanent: true,
      },
      {
        source: "/intracore",
        destination: "/intranet/thecore",
        permanent: true,
      },
      {
        source: "/intranet/intracore/agency/:id/:path*",
        destination: "/intranet/agency/:id/:path*",
        permanent: true,
      },
      {
        source: "/intranet/intracore/agency/:id",
        destination: "/intranet/agency/:id",
        permanent: true,
      },
      {
        source: "/intranet/intracore/:path*",
        destination: "/intranet/thecore/:path*",
        permanent: true,
      },
      {
        source: "/intranet/intracore",
        destination: "/intranet/thecore",
        permanent: true,
      },
      {
        source: "/intranet/agency/:id/travelers",
        destination: "/intranet/agency/:id/registered-travelers",
        permanent: true,
      },
      {
        source: "/intranet/agency/:id/traveleres",
        destination: "/intranet/agency/:id/registered-travelers",
        permanent: true,
      },
      {
        source: "/intranet/agency/:id/dashboard",
        destination: "/intranet/agency/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
