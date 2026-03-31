"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2>حدث خطأ في التطبيق</h2>
        <p style={{ color: "#666" }}>{error.message}</p>
        <button onClick={() => reset()} style={{ padding: "8px 24px", borderRadius: "8px", background: "#8B5CF6", color: "white", border: "none", cursor: "pointer", marginTop: "1rem" }}>
          إعادة المحاولة
        </button>
      </body>
    </html>
  );
}
