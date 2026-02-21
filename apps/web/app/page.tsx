import React from "react";
import Image from "next/image";

export default function WebHome() {
  return (
    <main style={{ minHeight: "100vh", overflowX: "hidden", direction: "rtl" }}>

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 40px",
        background: "rgba(15,10,30,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(139,92,246,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo.png" alt="حلّها" width={36} height={36} style={{ objectFit: "contain" }} />
          <span style={{
            fontSize: 22, fontWeight: 900,
            background: "linear-gradient(135deg, #C4B5FD, #EC4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>حلّها</span>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          {["الخدمات", "كيف تعمل", "انضم إلينا"].map(l => (
            <a key={l} href="#" style={{
              color: "rgba(243,240,255,0.65)", fontSize: 14, fontWeight: 600,
              textDecoration: "none",
            }}>{l}</a>
          ))}
        </div>
        <button style={{
          padding: "9px 22px", borderRadius: 10,
          background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
          border: "none", color: "white", fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          حمّل التطبيق
        </button>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0F0A1E 0%, #1E0A3C 40%, #2D0F54 70%, #3D0F6B 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glows */}
        <div style={{
          position: "absolute", top: -100, right: -100, width: 500, height: 500,
          background: "radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80, width: 400, height: 400,
          background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{
          width: 110, height: 110, borderRadius: 28,
          background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))",
          border: "1px solid rgba(139,92,246,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 28, boxShadow: "0 0 60px rgba(139,92,246,0.4)",
        }}>
          <Image src="/logo.png" alt="حلّها" width={80} height={80} style={{ objectFit: "contain" }} />
        </div>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 20, marginBottom: 20,
          background: "rgba(139,92,246,0.15)",
          border: "1px solid rgba(139,92,246,0.35)",
        }}>
          <span style={{ fontSize: 10, color: "#34D399", fontWeight: 700 }}>● متاح الآن في قنا</span>
          <span style={{ color: "rgba(243,240,255,0.5)", fontSize: 13 }}>وقريباً مصر والسعودية</span>
        </div>

        {/* Headline */}
        <h1 style={{
          margin: 0, lineHeight: 1.1,
          fontSize: "clamp(48px, 9vw, 84px)", fontWeight: 900,
          background: "linear-gradient(135deg, #C4B5FD 0%, #F0ABFC 50%, #EC4899 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: -2,
        }}>
          حلّها
        </h1>

        <p style={{
          marginTop: 12, fontSize: "clamp(18px, 3vw, 26px)",
          color: "rgba(243,240,255,0.8)", fontWeight: 700,
        }}>
          كل اللي تحتاجه — في دقائق
        </p>
        <p style={{
          marginTop: 8, fontSize: "clamp(14px, 2vw, 17px)",
          color: "rgba(243,240,255,0.45)", maxWidth: 520, lineHeight: 1.7,
        }}>
          طلب أكل · صيدلية · حجز طبيب · وتوصيل سريع لباب بيتك
        </p>

        {/* CTA */}
        <div style={{ marginTop: 40, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <button style={{
            padding: "15px 34px", borderRadius: 14,
            background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
            border: "none", color: "white", fontSize: 16, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 6px 30px rgba(139,92,246,0.5)",
          }}>
            📱 حمّل التطبيق مجاناً
          </button>
          <button style={{
            padding: "15px 34px", borderRadius: 14,
            background: "transparent",
            border: "1.5px solid rgba(139,92,246,0.5)",
            color: "#C4B5FD", fontSize: 16, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            🏪 انضم كشريك
          </button>
        </div>

        {/* Stats */}
        <div style={{
          marginTop: 64, display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center",
        }}>
          {[
            { value: "500+",   label: "عميل مسجّل" },
            { value: "30+",    label: "شريك وتاجر" },
            { value: "< 30",  label: "دقيقة توصيل" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900,
                background: "linear-gradient(135deg, #C4B5FD, #EC4899)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "rgba(243,240,255,0.45)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES
      ══════════════════════════════════════════ */}
      <section style={{
        padding: "90px 24px",
        background: "#0C0919",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: "#8B5CF6", fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>
              الخدمات
            </p>
            <h2 style={{
              margin: 0, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900,
              background: "linear-gradient(135deg, #C4B5FD, #F0ABFC)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              كل اللي تحتاجه في مكان واحد
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}>
            {[
              { icon: "🍔", title: "طعام وأكل",      desc: "من أقرب المطاعم والمحلات يوصلك طازج في أقل من 30 دقيقة", color: "#F59E0B" },
              { icon: "💊", title: "صيدلية",           desc: "اطلب دواءك أو ارفع روشتتك وهيوصلك على طول",             color: "#34D399" },
              { icon: "🏥", title: "حجز طبيب",         desc: "احجز موعد مع أقرب دكتور أو استشر أونلاين",             color: "#60A5FA" },
              { icon: "🛵", title: "توصيل سريع",        desc: "مناديب محترفين متاحون طول اليوم",                       color: "#EC4899" },
            ].map(f => (
              <div key={f.title} style={{
                padding: "28px 24px", borderRadius: 20,
                background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.05))",
                border: "1px solid rgba(139,92,246,0.2)",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, marginBottom: 18,
                  background: `${f.color}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28,
                }}>{f.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 800, color: "#E9D5FF" }}>
                  {f.title}
                </h3>
                <p style={{ margin: 0, color: "rgba(243,240,255,0.5)", fontSize: 14, lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section style={{
        padding: "90px 24px",
        background: "linear-gradient(180deg, #0C0919 0%, #0F0A1E 100%)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#EC4899", fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>
            كيف تعمل
          </p>
          <h2 style={{
            margin: "0 0 56px", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900,
            background: "linear-gradient(135deg, #F0ABFC, #EC4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            3 خطوات بس
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              { step: "01", icon: "📱", title: "حمل التطبيق",       desc: "سجّل حسابك في ثوانٍ وابدأ فوراً" },
              { step: "02", icon: "🛒", title: "اختر اللي تريده",    desc: "تصفّح المطاعم والصيدليات وابعت طلبك" },
              { step: "03", icon: "🎉", title: "استلم على بيتك",     desc: "المندوب يوصلك في أقل من 30 دقيقة" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "32px 20px", borderRadius: 20, position: "relative",
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}>
                <div style={{
                  position: "absolute", top: -14, right: 20,
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  borderRadius: 10, padding: "3px 12px",
                  fontSize: 11, fontWeight: 900, color: "white",
                }}>{s.step}</div>
                <div style={{ fontSize: 40, marginBottom: 16, marginTop: 8 }}>{s.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: "#E9D5FF" }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(243,240,255,0.5)", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PARTNER CTA
      ══════════════════════════════════════════ */}
      <section style={{
        padding: "80px 24px",
        background: "#0C0919",
      }}>
        <div style={{
          maxWidth: 800, margin: "0 auto", textAlign: "center",
          padding: "60px 40px", borderRadius: 28,
          background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
          border: "1px solid rgba(139,92,246,0.3)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -60, left: -60, width: 200, height: 200,
            background: "radial-gradient(circle, rgba(236,72,153,0.2), transparent 70%)",
          }} />
          <p style={{ color: "#EC4899", fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>
            للأعمال والمحلات
          </p>
          <h2 style={{
            margin: "0 0 14px", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900,
            color: "white",
          }}>
            وسّع نطاق مشروعك مع حلّها
          </h2>
          <p style={{
            margin: "0 0 32px", fontSize: 15,
            color: "rgba(243,240,255,0.55)", lineHeight: 1.7, maxWidth: 500, marginInline: "auto",
          }}>
            انضم كشريك وابدأ تستقبل طلبات أونلاين من يومها — لوحة تحكم احترافية، تسويق مجاني، وتوصيل جاهز
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{
              padding: "14px 30px", borderRadius: 12,
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              border: "none", color: "white", fontSize: 15, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 6px 24px rgba(139,92,246,0.4)",
            }}>
              سجّل متجرك الآن
            </button>
            <button style={{
              padding: "14px 30px", borderRadius: 12,
              background: "transparent",
              border: "1.5px solid rgba(139,92,246,0.4)",
              color: "#C4B5FD", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              تعرّف أكثر
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #0C0919 0%, #0A0715 100%)",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{
            textAlign: "center", marginBottom: 48,
            fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900,
            background: "linear-gradient(135deg, #C4B5FD, #F0ABFC)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            بيقولوا عننا إيه؟
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {[
              { name: "أحمد علي",      city: "قنا",    stars: 5, text: "التطبيق سريع جداً والتوصيل وصل في 20 دقيقة. ممتاز!" },
              { name: "فاطمة محمود",   city: "قنا",    stars: 5, text: "طلبت من الصيدلية وجاء في نص ساعة. خدمة تمام التمام." },
              { name: "محمد إبراهيم",  city: "قنا",    stars: 5, text: "لوحة التحكم للمتجر سهلة جداً وابدأنا نستقبل طلبات من أول يوم." },
            ].map((t, i) => (
              <div key={i} style={{
                padding: "24px 20px", borderRadius: 18,
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.18)",
              }}>
                <div style={{ color: "#F59E0B", fontSize: 16, marginBottom: 12 }}>
                  {"★".repeat(t.stars)}
                </div>
                <p style={{
                  margin: "0 0 16px", fontSize: 14,
                  color: "rgba(243,240,255,0.65)", lineHeight: 1.7,
                }}>
                  "{t.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18,
                    background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 900, color: "white",
                  }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E9D5FF" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(243,240,255,0.4)" }}>{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DOWNLOAD CTA
      ══════════════════════════════════════════ */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(135deg, #1E0A3C, #3D0F6B)",
        textAlign: "center",
      }}>
        <Image src="/logo.png" alt="حلّها" width={64} height={64} style={{ objectFit: "contain", marginBottom: 20 }} />
        <h2 style={{
          margin: "0 0 12px", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: "white",
        }}>
          جاهز تجرّب حلّها؟
        </h2>
        <p style={{
          margin: "0 0 36px", fontSize: 16,
          color: "rgba(243,240,255,0.55)", lineHeight: 1.7,
        }}>
          حمّل التطبيق مجاناً وابدأ تطلب من أقرب المحلات دلوقتي
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { icon: "🍎", label: "App Store",     sub: "قريباً" },
            { icon: "🤖", label: "Google Play",   sub: "قريباً" },
          ].map(btn => (
            <button key={btn.label} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 28px", borderRadius: 14,
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              color: "white", cursor: "pointer", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 24 }}>{btn.icon}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{btn.sub}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{btn.label}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{
        padding: "40px 24px 24px",
        background: "#0A0715",
        borderTop: "1px solid rgba(139,92,246,0.15)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 16, marginBottom: 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Image src="/logo.png" alt="حلّها" width={32} height={32} style={{ objectFit: "contain" }} />
              <span style={{
                fontSize: 18, fontWeight: 900,
                background: "linear-gradient(135deg, #C4B5FD, #EC4899)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>حلّها</span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["الرئيسية", "الخدمات", "الشركاء", "اتصل بنا"].map(l => (
                <a key={l} href="#" style={{
                  color: "rgba(243,240,255,0.4)", fontSize: 13,
                  textDecoration: "none", fontWeight: 600,
                }}>{l}</a>
              ))}
            </div>
          </div>
          <div style={{
            paddingTop: 20, borderTop: "1px solid rgba(139,92,246,0.1)",
            display: "flex", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            fontSize: 12, color: "rgba(243,240,255,0.25)",
          }}>
            <span>© {new Date().getFullYear()} حلّها — جميع الحقوق محفوظة</span>
            <span>صُنع بـ ❤️ في مصر</span>
          </div>
        </div>
      </footer>

    </main>
  );
}
