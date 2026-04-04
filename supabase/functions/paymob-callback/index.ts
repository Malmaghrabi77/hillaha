import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


serve(async (req: Request) => {
  try {
    const body = await req.json();
    const { obj } = body;

    if (!obj) {
      return new Response("Missing transaction object", { status: 400 });
    }

    // Verify HMAC signature (mandatory)
    const HMAC_SECRET = Deno.env.get("PAYMOB_HMAC_SECRET");
    if (!HMAC_SECRET) {
      return new Response("HMAC secret not configured", { status: 500 });
    }
    if (!body.hmac) {
      return new Response("Missing HMAC signature", { status: 403 });
    }

    {
      const dataToHash = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success,
      ].join("");

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(HMAC_SECRET),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToHash));
      const computedHmac = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (computedHmac !== body.hmac) {
        return new Response("Invalid HMAC", { status: 403 });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const orderId = obj.order?.merchant_order_id || obj.payment_key_claims?.extra?.order_id;
    const isSuccess = obj.success === true && obj.pending === false;

    if (!orderId) {
      console.error("Could not determine order ID from PayMob callback", {
        merchant_order_id: obj.order?.merchant_order_id,
        extra_order_id: obj.payment_key_claims?.extra?.order_id,
        transaction_id: obj.id,
      });
      return new Response(
        JSON.stringify({ error: "Could not determine order ID from transaction" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify payment amount matches order total before marking as paid
    const { data: order } = await supabase
      .from("orders")
      .select("total, payment_status")
      .eq("id", orderId)
      .single();

    // Idempotency: skip if already processed
    if (order?.payment_status === "paid") {
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Amount verification: PayMob sends amount in cents
    const expectedCents = order ? Math.round(order.total * 100) : null;
    const receivedCents = obj.amount_cents;
    if (isSuccess && expectedCents !== null && receivedCents !== expectedCents) {
      console.error(`Amount mismatch for order ${orderId}: expected ${expectedCents}, got ${receivedCents}`);
      await supabase
        .from("orders")
        .update({
          payment_status: "amount_mismatch",
          paymob_transaction_id: String(obj.id),
        })
        .eq("id", orderId);
      return new Response(JSON.stringify({ received: true, error: "amount_mismatch" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("orders")
      .update({
        payment_status: isSuccess ? "paid" : "failed",
        paymob_transaction_id: String(obj.id),
      })
      .eq("id", orderId);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
