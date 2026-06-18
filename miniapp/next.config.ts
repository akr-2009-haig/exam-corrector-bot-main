import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module — must stay external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // The page is rendered inside Telegram's WebView only.
  poweredByHeader: false,
};

export default nextConfig;
