import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Arabic notification templates per order status
const STATUS_TEMPLATES: Record<string, { title: string; body: (orderId: string) => string; forCustomer: boolean; forDriver: boolean; forPartner: boolean }> = {
  accepted: {
    title: "تم قبول طلبك! ✅",
    body: (id) => `الطلب #${id.slice(0, 8)} تم قبوله وجاري تحضيره الآن`,
    forCustomer: true, forDriver: false, forPartner: false,
  },
  preparing: {
    title: "جاري تحضير الطلب 🍳",
    body: (id) => `الطلب #${id.slice(0, 8)} قيد التحضير`,
    forCustomer: true, forDriver: false, forPartner: false,
  },
  ready: {
    title: "طلبك جاهز! 📦",
    body: (id) => `الطلب #${id.slice(0, 8)} جاهز وبانتظار المندوب`,
    forCustomer: true, forDriver: true, forPartner: false,
  },
  picked_up: {
    title: "المندوب في الطريق 🛵",
    body: (id) => `الطلب #${id.slice(0, 8)} في طريقه إليك`,
    forCustomer: true, forDriver: false, forPartner: true,
  },
  on_way: {
    title: "المندوب في الطريق 🛵",
    body: (id) => `الطلب #${id.slice(0, 8)} في طريقه إليك`,
    forCustomer: true, forDriver: false, forPartner: false,
  },
  delivered: {
    title: "تم التوصيل! 🎉",
    body: (id) => `الطلب #${id.slice(0, 8)} تم توصيله بنجاح. شكراً لاستخدام حلّها!`,
    forCustomer: true, forDriver: false, forPartner: true,
  },
  cancelled: {
    title: "تم إلغاء الطلب ❌",
    body: (id) => `الطلب #${id.slice(0, 8)} تم إلغاؤه`,
    forCustomer: true, forDriver: true, forPartner: true,
  },
};

// Driver-specific templates
const DRIVER_TEMPLATES: Record<string, { title: string; body: (orderId: string) => string }> = {
  ready: {
    title: "طلب جديد جاهز للاستلام 📦",
    body: (id) => `الطلب #${id.slice(0, 8)} جاهز للاستلام من المتجر`,
  },
  cancelled: {
    title: "تم إلغاء الطلب ❌",
    body: (id) => `الطلب #${id.slice(0, 8)} تم إلغاؤه`,
  },
};

// Partner-specific templates
const PARTNER_TEMPLATES: Record<string, { title: string; body: (orderId: string) => string }> = {
  picked_up: {
    title: "المندوب استلم الطلب 🛵",
    body: (id) => `الطلب #${id.slice(0, 8)} تم استلامه من المندوب`,
  },
  delivered: {
    title: "تم التوصيل بنجاح ✅",
    body: (id) => `الطلب #${id.slice(0, 8)} وصل للعميل`,
  },
  cancelled: {
    title: "تم إلغاء الطلب ❌",
    body: (id) => `الطلب #${id.slice(0, 8)} تم إلغاؤه`,
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    const { order_id, new_status } = await req.json();

    if (!order_id || !new_status) {
      return new Response(
        JSON.stringify({ error: "order_id and new_status are required" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const template = STATUS_TEMPLATES[new_status];
    if (!template) {
      return new Response(
        JSON.stringify({ success: true, message: "No notification template for this status" }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Get order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, customer_id, partner_id, driver_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const notifyUrl = `${SUPABASE_URL}/functions/v1/send-notification`;
    const results: string[] = [];

    // Notify customer
    if (template.forCustomer && order.customer_id) {
      const custTemplate = template;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: order.customer_id,
          app_type: "customer",
          title: custTemplate.title,
          body: custTemplate.body(order.id),
          notification_type: "order",
          data: { order_id: order.id, status: new_status, screen: "tracking" },
        }),
      });
      results.push("customer");
    }

    // Notify driver
    if (template.forDriver && order.driver_id) {
      const driverTpl = DRIVER_TEMPLATES[new_status] || template;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: order.driver_id,
          app_type: "driver",
          title: driverTpl.title,
          body: driverTpl.body(order.id),
          notification_type: "order",
          data: { order_id: order.id, status: new_status, screen: "delivery" },
        }),
      });
      results.push("driver");
    }

    // Notify partner
    if (template.forPartner && order.partner_id) {
      const partnerTpl = PARTNER_TEMPLATES[new_status] || template;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: order.partner_id,
          title: partnerTpl.title,
          body: partnerTpl.body(order.id),
          notification_type: "order",
          data: { order_id: order.id, status: new_status },
        }),
      });
      results.push("partner");
    }

    return new Response(
      JSON.stringify({ success: true, notified: results }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
