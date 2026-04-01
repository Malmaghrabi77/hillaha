"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@hillaha/core";

const C = {
  primary: "#8B5CF6", primarySoft: "#EDE9FE",
  pink: "#EC4899", pinkSoft: "#FCE7F3",
  bg: "#FAFAFF", surface: "#FFFFFF",
  border: "#E7E3FF", text: "#1F1B2E",
  textMuted: "#6B6480", success: "#34D399",
  warning: "#F59E0B", danger: "#EF4444",
};

type Status = "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled" | "awaiting_payment_approval";

type DeliveryType = "platform" | "self";

interface Order {
  id: string;
  _uuid?: string;
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  address: string;
  total: number;
  status: Status;
  time: string;
  note?: string;
  paymentMethod: string;
  deliveryType?: DeliveryType;
}

const INITIAL_ORDERS: Order[] = [];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; next?: Status; nextLabel?: string; nextColor?: string }> = {
  pending:   { label: "بانتظار القبول", color: C.warning,  bg: "#FEF3C7", next: "accepted", nextLabel: "قبول الطلب", nextColor: C.primary },
  accepted:  { label: "مقبول",          color: C.primary,  bg: C.primarySoft, next: "preparing", nextLabel: "بدء التجهيز", nextColor: C.primary },
  preparing: { label: "قيد التجهيز",    color: C.primary,  bg: C.primarySoft, next: "ready", nextLabel: "جاهز للاستلام", nextColor: "#059669" },
  ready:     { label: "جاهز",           color: "#059669",  bg: "#D1FAE5", next: "picked_up", nextLabel: "تم الاستلام", nextColor: "#059669" },
  picked_up: { label: "تم الاستلام",    color: "#059669",  bg: "#D1FAE5", next: "delivered", nextLabel: "تم التسليم", nextColor: "#059669" },
  delivered: { label: "مُسلَّم",         color: "#059669",  bg: "#D1FAE5" },
  cancelled: { label: "ملغي",           color: C.danger,   bg: "#FEF2F2" },
  awaiting_payment_approval: { label: "بانتظار اعتماد الدفع", color: C.warning, bg: "#FEF3C7" },
};

const FILTERS: { key: Status | "all"; label: string }[] = [
  { key: "all",       label: "الكل" },
  { key: "pending",   label: "بانتظار القبول" },
  { key: "accepted",  label: "مقبول" },
  { key: "preparing", label: "قيد التجهيز" },
  { key: "ready",     label: "جاهز" },
  { key: "picked_up", label: "تم الاستلام" },
  { key: "delivered", label: "مُسلَّم" },
  { key: "cancelled", label: "ملغي" },
  { key: "awaiting_payment_approval", label: "بانتظار اعتماد الدفع" },
];

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>(INITIAL_ORDERS);
  const [filter, setFilter]   = useState<Status | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [acceptDialog, setAcceptDialog] = useState<{ orderId: string; uuid: string } | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);

  const supabase = getSupabase()!;

  // ─── دالة تحويل بيانات Supabase → واجهة Order ───────────
  function mapRow(row: any): Order {
    return {
      id:            row.id.substring(0, 8).toUpperCase(),
      _uuid:         row.id,
      customer:      row.profiles?.full_name ?? "عميل",
      phone:         row.customer_phone ?? row.profiles?.phone ?? "",
      items:         Array.isArray(row.items) ? row.items : [],
      address:       row.delivery_address,
      total:         Number(row.total),
      status:        row.status as Status,
      time:          new Date(row.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      note:          row.customer_note ?? undefined,
      paymentMethod: ({ cash: "كاش", instapay: "إنستاباي", vodafone: "فودافون كاش", etisalat: "اتصالات كاش", wallet: "المحفظة", wallet_transfer: "تحويل محفظة", card: "بطاقة", we_pay: "وي باي", orange_money: "اورانج موني", meeza: "ميزة", fawry: "فوري", aman: "أمان", bee: "بي", khazna: "خزنة" } as Record<string, string>)[row.payment_method] ?? row.payment_method,
      deliveryType:  row.delivery_type ?? "platform",
    };
  }

  // ─── جلب الطلبات + اشتراك real-time ─────────────────────
  useEffect(() => {
    async function loadOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*, profiles(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        setOrders(data.map(mapRow));
        setLiveCount(0);
      }
    }
    loadOrders();

    const channel = supabase
      .channel("partner-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders(prev => [mapRow(payload.new), ...prev]);
          setLiveCount(n => n + 1);
          // Play notification sound for new orders
          try {
            const audio = new Audio("/sounds/new-order.wav");
            audio.play();
          } catch (e) {}
        } else if (payload.eventType === "UPDATE") {
          setOrders(prev => prev.map(o =>
            (o as any)._uuid === payload.new.id ? mapRow(payload.new) : o
          ));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  async function advance(id: string, next: Status) {
    const order = orders.find(o => o.id === id);
    const uuid  = (order as any)?._uuid ?? id;
    const tsField: Partial<Record<Status, string>> = {
      accepted:  "accepted_at",
      preparing: "preparing_at",
      ready:     "ready_at",
      picked_up: "picked_up_at",
      delivered: "delivered_at",
      cancelled: "cancelled_at",
    };
    const extra = tsField[next] ? { [tsField[next]!]: new Date().toISOString() } : {};
    await (supabase as any).from("orders").update({ status: next, ...extra }).eq("id", uuid);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: next } : null);
  }

  async function cancel(id: string) {
    const order = orders.find(o => o.id === id);
    const uuid  = (order as any)?._uuid ?? id;
    await (supabase as any).from("orders").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", uuid);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: "cancelled" } : null);
  }

  function openAcceptDialog(id: string) {
    const order = orders.find(o => o.id === id);
    const uuid = (order as any)?._uuid ?? id;
    setAcceptDialog({ orderId: id, uuid });
  }

  async function acceptWithDeliveryType(dt: DeliveryType) {
    if (!acceptDialog) return;
    setAcceptLoading(true);
    const { data, error } = await (supabase as any).rpc("accept_order_with_delivery_type", {
      p_order_id: acceptDialog.uuid,
      p_delivery_type: dt,
    });
    setAcceptLoading(false);
    if (error || !data?.success) {
      alert(data?.error || error?.message || "حدث خطأ");
      return;
    }
    setOrders(prev => prev.map(o =>
      o.id === acceptDialog.orderId ? { ...o, status: "accepted" as Status, deliveryType: dt } : o
    ));
    if (selected?.id === acceptDialog.orderId) {
      setSelected(prev => prev ? { ...prev, status: "accepted" as Status, deliveryType: dt } : null);
    }
    setAcceptDialog(null);
  }

  const counts: Record<string, number> = { all: orders.length };
  orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>إدارة الطلبات</h1>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "3px 10px", borderRadius: 20,
              background: "#D1FAE5", border: "1px solid #34D399",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: "#059669" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>مباشر</span>
            </div>
          </div>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>
            تابع وقبل طلبات العملاء في الوقت الفعلي
          </p>
        </div>
        {liveCount > 0 && (
          <button
            onClick={() => setLiveCount(0)}
            style={{
              padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
              background: C.primary, color: "white", fontWeight: 700, fontSize: 13,
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
            }}
          >
            🔔 {liveCount} طلب جديد
          </button>
        )}
      </div>

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "7px 16px", borderRadius: 20, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: filter === f.key ? C.primary : C.surface,
              color: filter === f.key ? "white" : C.textMuted,
              boxShadow: filter === f.key ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
              border: filter === f.key ? "none" : `1px solid ${C.border}`,
            }}
          >
            {f.label}
            {counts[f.key] ? (
              <span style={{
                marginRight: 6, padding: "1px 7px", borderRadius: 20, fontSize: 11,
                background: filter === f.key ? "rgba(255,255,255,0.25)" : C.primarySoft,
                color: filter === f.key ? "white" : C.primary,
              }}>
                {counts[f.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 16 }}>
        {/* ORDER LIST */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{
              background: C.surface, borderRadius: 16, padding: 40,
              border: `1px solid ${C.border}`, textAlign: "center", color: C.textMuted,
            }}>
              لا توجد طلبات في هذه الفئة
            </div>
          )}
          {filtered.map(o => {
            const st = STATUS_CONFIG[o.status];
            const isSelected = selected?.id === o.id;
            return (
              <div
                key={o.id}
                onClick={() => setSelected(isSelected ? null : o)}
                style={{
                  background: C.surface, borderRadius: 16, padding: 18,
                  border: `1.5px solid ${isSelected ? C.primary : C.border}`,
                  boxShadow: isSelected ? `0 0 0 3px ${C.primarySoft}` : "0 2px 8px rgba(0,0,0,0.04)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontWeight: 900, color: C.primary, fontSize: 14 }}>{o.id}</span>
                    <span style={{ margin: "0 8px", color: C.border }}>|</span>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{o.customer}</span>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{o.time} — {o.paymentMethod}</div>
                  </div>
                  <span style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    color: st.color, background: st.bg,
                  }}>{st.label}</span>
                </div>

                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>
                  {o.items.map(item => `${item.name} × ${item.qty}`).join("، ")}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{o.total} ج</span>
                    {o.deliveryType && o.status !== "pending" && o.status !== "cancelled" && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: o.deliveryType === "self" ? "#D1FAE5" : C.primarySoft,
                        color: o.deliveryType === "self" ? "#059669" : C.primary,
                      }}>
                        {o.deliveryType === "self" ? "توصيل ذاتي" : "توصيل منصة"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {o.status === "pending" ? (
                      <button
                        onClick={e => { e.stopPropagation(); openAcceptDialog(o.id); }}
                        style={{
                          padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                          background: C.primary, color: "white", fontSize: 12, fontWeight: 700,
                        }}
                      >
                        قبول الطلب
                      </button>
                    ) : st.next ? (
                      <button
                        onClick={e => { e.stopPropagation(); advance(o.id, st.next!); }}
                        style={{
                          padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                          background: st.nextColor ?? C.primary, color: "white",
                          fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {o.status === "ready" && o.deliveryType === "self" ? "تم استلام الموظف" : st.nextLabel}
                      </button>
                    ) : null}
                    {o.status === "pending" && (
                      <button
                        onClick={e => { e.stopPropagation(); cancel(o.id); }}
                        style={{
                          padding: "6px 14px", borderRadius: 10, border: `1px solid #FECACA`,
                          cursor: "pointer", background: "transparent",
                          color: C.danger, fontSize: 12, fontWeight: 700,
                        }}
                      >
                        رفض
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ORDER DETAIL PANEL */}
        {selected && (() => {
          const st = STATUS_CONFIG[selected.status];
          return (
            <div style={{
              background: C.surface, borderRadius: 20, padding: 24,
              border: `1px solid ${C.border}`, height: "fit-content",
              boxShadow: "0 4px 20px rgba(139,92,246,0.08)",
              position: "sticky", top: 24,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.text }}>
                  تفاصيل {selected.id}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
                    background: "transparent", cursor: "pointer", fontSize: 14, color: C.textMuted,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >✕</button>
              </div>

              {/* Status Badge */}
              <div style={{
                padding: "10px 16px", borderRadius: 12, marginBottom: 16,
                background: st.bg, textAlign: "center",
              }}>
                <span style={{ fontWeight: 700, color: st.color, fontSize: 13 }}>{st.label}</span>
              </div>

              {/* Delivery Type Badge */}
              {selected.deliveryType && selected.status !== "pending" && selected.status !== "cancelled" && (
                <div style={{
                  padding: "10px 16px", borderRadius: 12, marginBottom: 16, textAlign: "center",
                  background: selected.deliveryType === "self" ? "#D1FAE5" : C.primarySoft,
                  border: `1px solid ${selected.deliveryType === "self" ? "#34D399" : "#C4B5FD"}`,
                }}>
                  <span style={{
                    fontWeight: 700, fontSize: 13,
                    color: selected.deliveryType === "self" ? "#059669" : C.primary,
                  }}>
                    {selected.deliveryType === "self" ? "🏪 توصيل ذاتي — موظفك" : "🛵 توصيل عبر المنصة — كابتن من التطبيق"}
                  </span>
                </div>
              )}

              {/* Customer Info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>معلومات العميل</div>
                <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>📋 {selected.customer}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>📞 {selected.phone}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>📍 {selected.address}</div>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>البنود</div>
                {selected.items.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 0", borderBottom: i < selected.items.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <span style={{ fontSize: 13, color: C.text }}>{item.name} × {item.qty}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.price * item.qty} ج</span>
                  </div>
                ))}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginTop: 10, padding: "10px 0 0", borderTop: `2px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: C.text }}>الإجمالي</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: C.primary }}>{selected.total} ج</span>
                </div>
              </div>

              {/* Payment */}
              <div style={{
                background: C.primarySoft, borderRadius: 10, padding: "8px 12px",
                fontSize: 13, color: C.primary, fontWeight: 700, marginBottom: 16,
              }}>
                💳 الدفع: {selected.paymentMethod}
              </div>

              {/* Note */}
              {selected.note && (
                <div style={{
                  background: "#FEF3C7", borderRadius: 10, padding: "8px 12px",
                  fontSize: 13, color: "#92400E", marginBottom: 16, border: "1px solid #FDE68A",
                }}>
                  📝 {selected.note}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.status === "pending" ? (
                  <button
                    onClick={() => openAcceptDialog(selected.id)}
                    style={{
                      width: "100%", padding: 12, borderRadius: 12, border: "none",
                      background: C.primary, color: "white",
                      fontSize: 14, fontWeight: 900, cursor: "pointer",
                    }}
                  >
                    قبول الطلب
                  </button>
                ) : st.next ? (
                  <button
                    onClick={() => advance(selected.id, st.next!)}
                    style={{
                      width: "100%", padding: 12, borderRadius: 12, border: "none",
                      background: st.nextColor ?? C.primary, color: "white",
                      fontSize: 14, fontWeight: 900, cursor: "pointer",
                    }}
                  >
                    {selected.status === "ready" && selected.deliveryType === "self" ? "تم استلام الموظف" : st.nextLabel}
                  </button>
                ) : null}
                {selected.status === "pending" && (
                  <button
                    onClick={() => cancel(selected.id)}
                    style={{
                      width: "100%", padding: 12, borderRadius: 12,
                      border: `1.5px solid #FECACA`, background: "#FEF2F2",
                      color: C.danger, fontSize: 14, fontWeight: 900, cursor: "pointer",
                    }}
                  >
                    رفض الطلب
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ═══════ DELIVERY TYPE MODAL ═══════ */}
      {acceptDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div dir="rtl" style={{
            background: C.surface, borderRadius: 24, padding: 32, width: 420, maxWidth: "90vw",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: C.text, textAlign: "center" }}>
              اختر نوع التوصيل
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: C.textMuted, textAlign: "center" }}>
              كيف سيتم توصيل هذا الطلب للعميل؟
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {/* Platform Delivery */}
              <button
                disabled={acceptLoading}
                onClick={() => acceptWithDeliveryType("platform")}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 16,
                  border: `2px solid ${C.primary}`, background: C.primarySoft,
                  cursor: acceptLoading ? "wait" : "pointer", textAlign: "right",
                }}
              >
                <span style={{ fontSize: 32 }}>🛵</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: C.primary }}>توصيل عبر المنصة</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    كابتن من التطبيق يستلم ويوصّل الطلب
                  </div>
                  <div style={{ fontSize: 11, color: C.primary, marginTop: 4, fontWeight: 700 }}>
                    عمولة 15% على المجموع + رسوم التوصيل
                  </div>
                </div>
              </button>

              {/* Self Delivery */}
              <button
                disabled={acceptLoading}
                onClick={() => acceptWithDeliveryType("self")}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 16,
                  border: "2px solid #34D399", background: "#D1FAE5",
                  cursor: acceptLoading ? "wait" : "pointer", textAlign: "right",
                }}
              >
                <span style={{ fontSize: 32 }}>🏪</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: "#059669" }}>توصيل ذاتي</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    موظف لديك يستلم ويوصّل الطلب
                  </div>
                  <div style={{ fontSize: 11, color: "#059669", marginTop: 4, fontWeight: 700 }}>
                    عمولة 10% على المجموع الفرعي فقط — بدون رسوم توصيل
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setAcceptDialog(null)}
              disabled={acceptLoading}
              style={{
                width: "100%", padding: 12, borderRadius: 12,
                border: `1.5px solid ${C.border}`, background: "transparent",
                color: C.textMuted, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
