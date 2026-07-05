/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This project lives under a home dir that has its own lockfile; pin the
  // tracing root to this folder so Next doesn't pick the wrong workspace root.
  outputFileTracingRoot: import.meta.dirname,
  // Type-checking still runs and guards correctness; we don't want style-only
  // lint warnings to block the production build.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Design uses external food photography (Google-hosted placeholders) and QR codes.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "api.qrserver.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
