import React from "react";

export const metadata = {
  title: "حلّها — خدمات توصيل محلية",
  description: "منصة طلبات وخدمات محلية — مصر والسعودية",
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
