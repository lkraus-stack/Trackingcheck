import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externe Pakete die nicht gebundelt werden sollen
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  
  // Experimentelle Features
  experimental: {
    // Server Actions Timeout erhöhen (60 Sekunden)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
