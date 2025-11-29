/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Du nutzt den App Router (app/), daher aktivieren:
  experimental: {
    appDir: true,
  },

  // Falls du Next/Image nutzt, kannst du Domains hier ergänzen:
  images: {
    unoptimized: true,  // wichtig, wenn Firebase Storage genutzt wird
  },
};

export default nextConfig;