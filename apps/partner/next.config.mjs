/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // اسمح لـ Next.js بتجميع حزم الـ workspace المكتوبة بـ TypeScript مباشرةً
  transpilePackages: ["@hillaha/core", "@hillaha/ui"],

  // تخطي ESLint configuration issues during build
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
