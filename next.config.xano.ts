import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pdfkit"],
  // Skip API routes during static export — they're server-side only
  // and the static build is just for the frontend pages.
  // All API calls from the static site go to the Render deployment
  // or directly to Xano's public API endpoints.
  exportPathMap: async function () {
    // Return only page routes, skip /api/* routes
    return {
      '/': { page: '/' },
      '/signin': { page: '/signin' },
      '/signup': { page: '/signup' },
      '/dashboard': { page: '/dashboard' },
      '/forms/ai': { page: '/forms/ai' },
      '/forms/new': { page: '/forms/new' },
      '/templates': { page: '/templates' },
      '/submissions': { page: '/submissions' },
      '/api-keys': { page: '/api-keys' },
      '/settings': { page: '/settings' },
      '/sdk-demo': { page: '/sdk-demo' },
    };
  },
};

export default nextConfig;
