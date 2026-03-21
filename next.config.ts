import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externe Pakete die nicht gebundelt werden sollen
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  
  // Experimentelle Features
  experimental: {
    // Server Actions Timeout erhöhen (60 Sekunden)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
