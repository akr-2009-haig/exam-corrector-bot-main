import type { Metadata, Viewport } from "next";
import Script from "next/script";
import SpaceBackground from "./components/ui/SpaceBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة الامتحانات",
  description: "تصحيح الامتحانات، التصنيف والمسابقات",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b1426",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Telegram Mini App bridge — must load before the page scripts. */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <SpaceBackground />
        {children}
      </body>
    </html>
  );
}
