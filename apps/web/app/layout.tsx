import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "حلّها — Hillaha",
  description: "منصة التوصيل والخدمات المنزلية في قنا",
  metadataBase: new URL("https://www.hillaha.com"),
  openGraph: {
    title: "حلّها — Hillaha",
    description: "منصة التوصيل والخدمات المنزلية في قنا",
    url: "https://www.hillaha.com",
    siteName: "Hillaha",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "حلّها — Hillaha",
    description: "منصة التوصيل والخدمات المنزلية في قنا",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Cairo', system-ui, Arial, sans-serif",
        background: "#0F0A1E",
        color: "#F3F0FF",
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
