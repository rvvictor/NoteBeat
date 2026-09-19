import type { NextConfig } from "next";

// In production the API lives on another host (Render) while the app runs on
// Vercel. Browsers treat that as a third party, so the httpOnly auth cookie
// would be dropped by Safari/Firefox and middleware.ts — which reads the cookie
// to guard /dashboard — would never see it. Proxying /api/* through this app
// keeps the cookie first-party. Set BACKEND_ORIGIN on Vercel and point
// NEXT_PUBLIC_API_BASE_URL at /api; unset, the app talks to the API directly.
const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (!backendOrigin) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
