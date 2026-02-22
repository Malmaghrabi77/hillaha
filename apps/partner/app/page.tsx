"use client";
import React, { useEffect, useState } from "react";

// ─── TODO: استبدل هذه الروابط برابط التطبيق الحقيقي بعد النشر على المتاجر ───
const STORE_URLS = {
  playStore:   "https://play.google.com/store/apps/details?id=com.hillaha.customer",
  appStore:    "https://apps.apple.com/app/hillaha/id000000000",
  huaweiStore: "https://appgallery.huawei.com/app/C000000000",
};
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#059669",
  comingSoon: "#7C3AED",
};

function qrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=6D28D9&bgcolor=FFFFFF&data=${encodeURIComponent(url)}`;
}

const STORES = [
  {
    key:   "playStore",
    label: "Google Play",
    icon:  "▶",
    iconBg: "#01875F",
    url:   STORE_URLS.playStore,
    platform: "Android",
  },
  {
    key:   "appStore",
    label: "App Store",
    icon:  "",
    iconBg: "#1C1C1E",
    url:   STORE_URLS.appStore,
    platform: "iPhone & iPad",
  },
  {
    key:   "huaweiStore",
    label: "AppGallery",
    icon:  "🌐",
    iconBg: "#CF0A2C",
    url:   STORE_URLS.huaweiStore,
    platform: "Huawei",
  },
];

const FEATURES = [
  { icon: "⚡", title: "توصيل سريع",     desc: "تتبّع طلبك لحظةً بلحظة حتى يصلك بأسرع وقت" },
  { icon: "🔒", title: "دفع آمن",         desc: "طرق دفع متعددة بحماية كاملة لبياناتك" },
  { icon: "📍", title: "تتبّع مباشر",    desc: "شاهد المندوب على الخريطة وأنت في مكانك" },
  { icon: "🏪", title: "متاجر متنوعة",   desc: "اختر من مئات المطاعم والمتاجر القريبة منك" },
];

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── TOPBAR ─────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="حلّها" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <span style={{ fontWeight: 900, fontSize: 18, color: C.text }}>حلّها</span>
        </div>
        <a
          href="/login"
          style={{
            padding: "8px 18px", borderRadius: 10,
            border: `1.5px solid ${C.primary}`,
            color: C.primary, fontWeight: 700, fontSize: 13,
            transition: "all 0.15s",
          }}
        >
          شريك؟ سجّل الدخول
        </a>
      </header>

      {/* ── BG BLOBS ────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: -120, right: -100, width: 400, height: 400, borderRadius: "50%", background: C.primarySoft, opacity: 0.5, zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: C.pinkSoft, opacity: 0.4, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section style={{
          textAlign: "center",
          padding: isMobile ? "60px 24px 48px" : "80px 24px 64px",
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: `linear-gradient(135deg, ${C.primary}, ${C.pink})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: `0 12px 32px rgba(139,92,246,0.35)`,
          }}>
            <img src="/logo.png" alt="حلّها" style={{ width: 60, height: 60, objectFit: "contain" }} />
          </div>

          <h1 style={{
            fontSize: isMobile ? 30 : 44, fontWeight: 900, color: C.text,
            margin: "0 0 6px",
            lineHeight: 1.3,
          }}>
            حلها{" "}
            <span style={{
              background: `linear-gradient(135deg, ${C.primary}, ${C.pink})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              يحلها
            </span>
          </h1>
          <p style={{
            fontSize: isMobile ? 13 : 15, fontWeight: 700,
            color: C.textMuted, margin: "0 0 14px",
            letterSpacing: 1,
            direction: "ltr",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span>7illaha</span>
            <img src="/logo.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
            <span>7illaha</span>
          </p>

          <p style={{
            fontSize: isMobile ? 15 : 17, color: C.textMuted,
            maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.8,
          }}>
            طلب سهل، توصيل سريع، تتبّع مباشر. حمّل تطبيق حلّها الآن واستمتع
            بتجربة توصيل مختلفة.
          </p>

          {/* Download anchor */}
          <a
            href="#download"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", borderRadius: 16,
              background: `linear-gradient(135deg, ${C.primary}, #7C3AED)`,
              color: "white", fontWeight: 900, fontSize: 16,
              boxShadow: `0 8px 24px rgba(139,92,246,0.4)`,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(139,92,246,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(139,92,246,0.4)"; }}
          >
            📲 حمّل التطبيق الآن
          </a>
        </section>

        {/* ── FEATURES ────────────────────────────────────────── */}
        <section style={{ padding: isMobile ? "0 16px 56px" : "0 40px 72px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 16,
          }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: C.surface, borderRadius: 20, padding: "22px 18px",
                border: `1px solid ${C.border}`,
                boxShadow: "0 4px 16px rgba(139,92,246,0.07)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 14, color: C.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DOWNLOAD ────────────────────────────────────────── */}
        <section id="download" style={{
          padding: isMobile ? "48px 16px 64px" : "64px 40px 80px",
          textAlign: "center",
        }}>
          <div style={{
            display: "inline-block",
            background: `linear-gradient(135deg, ${C.primarySoft}, ${C.pinkSoft})`,
            padding: "4px 18px", borderRadius: 20, marginBottom: 16,
            fontSize: 12, fontWeight: 700, color: C.comingSoon,
            border: `1px solid ${C.border}`,
          }}>
            قريباً على جميع المتاجر
          </div>

          <h2 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: C.text, margin: "0 0 8px" }}>
            حمّل التطبيق الآن
          </h2>
          <p style={{ color: C.textMuted, fontSize: 14, margin: "0 0 40px" }}>
            متاح قريباً على Google Play و App Store و Huawei AppGallery
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 20, maxWidth: 760, margin: "0 auto",
          }}>
            {STORES.map(store => (
              <div key={store.key} style={{
                background: C.surface, borderRadius: 24, padding: "28px 20px",
                border: `1px solid ${C.border}`,
                boxShadow: "0 6px 24px rgba(139,92,246,0.1)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              }}>
                {/* Store badge */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 14px", borderRadius: 12,
                  background: store.iconBg, color: "white",
                  fontWeight: 700, fontSize: 13,
                }}>
                  <span>{store.icon}</span>
                  <span>{store.label}</span>
                </div>

                {/* Platform label */}
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                  {store.platform}
                </div>

                {/* QR Code — shown on desktop only */}
                {!isMobile && (
                  <div style={{
                    padding: 10, borderRadius: 16,
                    border: `2px solid ${C.border}`,
                    background: C.bg,
                    position: "relative",
                  }}>
                    {/* Blur overlay + coming soon */}
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: 14,
                      backdropFilter: "blur(3px)",
                      background: "rgba(237,233,254,0.6)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      zIndex: 2,
                    }}>
                      <span style={{ fontSize: 22 }}>🔒</span>
                      <span style={{ fontSize: 11, fontWeight: 900, color: C.comingSoon, marginTop: 4 }}>قريباً</span>
                    </div>
                    <img
                      src={qrUrl(store.url)}
                      alt={`QR ${store.label}`}
                      width={140} height={140}
                      style={{ display: "block", borderRadius: 8, opacity: 0.4 }}
                    />
                  </div>
                )}

                {/* Download button */}
                <a
                  href={store.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: "100%", padding: "11px 0", borderRadius: 12, textAlign: "center",
                    background: C.primarySoft, border: `1.5px solid ${C.border}`,
                    color: C.comingSoon, fontWeight: 700, fontSize: 13,
                    cursor: "not-allowed", opacity: 0.7,
                    display: "block",
                  }}
                  onClick={e => e.preventDefault()}
                >
                  قريباً — {store.label}
                </a>
              </div>
            ))}
          </div>

          {/* Info note */}
          <p style={{
            color: C.textMuted, fontSize: 12, marginTop: 28,
            maxWidth: 440, margin: "28px auto 0", lineHeight: 1.8,
          }}>
            سيتم تفعيل روابط التحميل ورموز QR فور نشر التطبيق على المتاجر
          </p>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer style={{
          borderTop: `1px solid ${C.border}`,
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <img src="/logo.png" alt="حلّها" style={{ width: 24, height: 24, objectFit: "contain" }} />
            <span style={{ fontWeight: 900, fontSize: 14, color: C.text }}>حلّها</span>
          </div>
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
            جميع الحقوق محفوظة لمجموعة حلّها {new Date().getFullYear()} بواسطة مصطفى المغربي
          </p>
        </footer>

      </div>
    </div>
  );
}
