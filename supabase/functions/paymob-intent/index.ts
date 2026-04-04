import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMOB_API_URL = "https://accept.paymob.com/v1/intention/";

const ALLOWED_ORIGINS = ["https://hillaha.com", "https://www.hillaha.com", "https://partner.hillaha.com"];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    // Verify user JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      });
    }

    const { amount_cents, order_id, customer_name, customer_email, customer_phone } = await req.json();

    if (!amount_cents || !order_id) {
      return new Response(JSON.stringify({ error: "amount_cents and order_id are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      });
    }

    // Validate amount_cents against actual order total
    if (order_id && !order_id.startsWith("temp_")) {
      const { data: orderData, error: orderError } = await supabaseAuth
        .from("orders")
        .select("total, customer_id")
        .eq("id", order_id)
        .single();

      if (orderError || !orderData) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders(req) },
        });
      }

      // Ensure the authenticated user owns this order
      if (orderData.customer_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden: order does not belong to user" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders(req) },
        });
      }

      // Verify amount matches order total (total is in EGP, amount_cents is in piasters)
      const expectedCents = Math.round(orderData.total * 100);
      if (amount_cents !== expectedCents) {
        return new Response(
          JSON.stringify({ error: "Amount mismatch: amount_cents does not match order total" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders(req) },
          }
        );
      }
    }

    const PAYMOB_SECRET_KEY = Deno.env.get("PAYMOB_SECRET_KEY");
    const PAYMOB_INTEGRATION_ID = Deno.env.get("PAYMOB_INTEGRATION_ID");

    if (!PAYMOB_SECRET_KEY || !PAYMOB_INTEGRATION_ID) {
      return new Response(JSON.stringify({ error: "PayMob not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      });
    }

    // Create PayMob payment intention
    const intentionRes = await fetch(PAYMOB_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amount_cents,
        currency: "EGP",
        payment_methods: [parseInt(PAYMOB_INTEGRATION_ID)],
        items: [
          {
            name: `طلب #${order_id.substring(0, 8)}`,
            amount: amount_cents,
            quantity: 1,
          },
        ],
        billing_data: {
          first_name: customer_name || "عميل",
          last_name: "حلّها",
          email: customer_email || "customer@hillaha.com",
          phone_number: customer_phone || "+201000000000",
          country: "EG",
        },
        extras: { order_id },
      }),
    });

    const intentionData = await intentionRes.json();

    if (!intentionRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to create payment", details: intentionData }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      });
    }

    // Update order with PayMob reference (only if order_id is a real UUID, not temp)
    if (order_id && !order_id.startsWith("temp_")) {
      await supabaseAuth
        .from("orders")
        .update({ paymob_order_id: intentionData.id })
        .eq("id", order_id);
    }

    return new Response(
      JSON.stringify({
        client_secret: intentionData.client_secret,
        paymob_order_id: String(intentionData.id),
        payment_url: `https://accept.paymob.com/unifiedcheckout/?publicKey=${Deno.env.get("PAYMOB_PUBLIC_KEY")}&clientSecret=${intentionData.client_secret}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }
});
