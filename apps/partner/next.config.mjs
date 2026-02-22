/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // اسمح لـ Next.js بتجميع حزم الـ workspace المكتوبة بـ TypeScript مباشرةً
  transpilePackages: ["@hillaha/core", "@hillaha/ui"],
};

export default nextConfig;
