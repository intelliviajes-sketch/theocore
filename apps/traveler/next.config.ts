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

  async redirects() {
    const appScope = (process.env.APP_SCOPE ?? "").toUpperCase();
    const scopeRedirects =
      appScope === "INTRANET"
        ? [
            {
              source: "/",
              destination: "/intranet",
              permanent: false,
            },
            {
              source: "/traveler",
              destination: "/intranet",
              permanent: false,
            },
            {
              source: "/traveler/:path*",
              destination: "/intranet",
              permanent: false,
            },
          ]
        : appScope === "TRAVELER"
          ? [
              {
                source: "/",
                destination: "/traveler",
                permanent: false,
              },
              {
                source: "/intranet",
                destination: "/traveler",
                permanent: false,
              },
              {
                source: "/intranet/:path*",
                destination: "/traveler",
                permanent: false,
              },
            ]
          : [];

    return [
      ...scopeRedirects,
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
