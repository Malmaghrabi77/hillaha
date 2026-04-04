/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow Next.js to compile workspace packages written in TypeScript directly
  transpilePackages: ["@hillaha/core", "@hillaha/ui"],

  // ESLint runs during builds to catch issues early
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
