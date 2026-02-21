import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0; padding: 0;
            font-family: 'Cairo', system-ui, sans-serif;
            background: #FAFAFF;
            color: #1F1B2E;
          }
          a { text-decoration: none; color: inherit; }
          button { font-family: 'Cairo', system-ui, sans-serif; cursor: pointer; }
          input, textarea, select { font-family: 'Cairo', system-ui, sans-serif; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
