"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1F1B2E", marginBottom: 12 }}>حدث خطأ غير متوقع</h2>
        <p style={{ color: "#6B6480", fontSize: 14, marginBottom: 20 }}>نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
        <button
          onClick={reset}
          style={{ padding: "12px 24px", borderRadius: 12, background: "#8B5CF6", color: "white", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
