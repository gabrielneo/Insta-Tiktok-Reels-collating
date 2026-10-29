/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the project root so stray lockfiles in parent folders aren't picked up.
  turbopack: { root: __dirname },
};

module.exports = nextConfig;
