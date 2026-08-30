import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the Z.ai preview iframe host to drive the dev server so that
  // client-side navigation (next/link clicks, router.push, RSC fetches) works
  // when the app is embedded inside the preview-chat-*.space-z.ai sandbox.
  // Without this, Next.js rejects cross-origin /_next/* requests from the
  // preview and silently breaks <Link> navigation in the iframe.
  allowedDevOrigins: [
    "*.space-z.ai",
    "preview-chat-*.space-z.ai",
    "localhost",
    "127.0.0.1",
  ],
  // Externalize server-side-only packages that use __dirname to locate
  // runtime data files. Without this, Turbopack/Webpack tries to bundle
  // them and mangles the __dirname resolution, causing ENOENT errors.
  // pdfkit ships .afm font metric files in node_modules/pdfkit/js/data/
  // and uses __dirname to find them at runtime.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
