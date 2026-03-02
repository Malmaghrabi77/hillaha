/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow Next.js to compile workspace packages written in TypeScript directly
  transpilePackages: ["@hillaha/core", "@hillaha/ui"],

  // Disable ESLint during build to avoid configuration issues
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
