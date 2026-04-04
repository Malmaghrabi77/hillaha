import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

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
    const {
      user_ids,
      app_type,
      title,
      body,
      data,
      sound = "default",
      priority = "high",
      notification_type,
      // For single user convenience
      user_id,
    } = await req.json();

    // Build target user IDs array
    const targetIds: string[] = user_ids || (user_id ? [user_id] : []);

    if (!targetIds.length || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_ids (or user_id), title, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
      );
    }

    // Get push tokens from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: tokens, error: tokensError } = await supabase.rpc("get_push_tokens", {
      p_user_ids: targetIds,
      p_app_type: app_type || null,
    });

    if (tokensError || !tokens?.length) {
      // Also check partners table for partner push tokens
      const { data: partnerTokens } = await supabase
        .from("partners")
        .select("id, push_token")
        .in("user_id", targetIds)
        .eq("notifications_enabled", true)
        .not("push_token", "is", null);

      const allTokens = [
        ...(tokens || []).map((t: any) => t.token),
        ...(partnerTokens || []).map((p: any) => p.push_token),
      ].filter(Boolean);

      if (!allTokens.length) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No active push tokens found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
        );
      }

      // Send to these tokens
      const results = await sendPushNotifications(allTokens, title, body, data, sound, priority);

      // Log notification
      await logNotifications(supabase, targetIds, notification_type || "system", title, body, data);

      return new Response(
        JSON.stringify({ success: true, sent: results.sent, failed: results.failed }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
      );
    }

    // Combine all tokens
    const pushTokenStrings = tokens.map((t: any) => t.token).filter(Boolean);

    // Also check partners table
    const { data: partnerTokens } = await supabase
      .from("partners")
      .select("id, push_token")
      .in("user_id", targetIds)
      .eq("notifications_enabled", true)
      .not("push_token", "is", null);

    if (partnerTokens?.length) {
      for (const p of partnerTokens) {
        if (p.push_token && !pushTokenStrings.includes(p.push_token)) {
          pushTokenStrings.push(p.push_token);
        }
      }
    }

    if (!pushTokenStrings.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active push tokens found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
      );
    }

    // Send push notifications via Expo
    const results = await sendPushNotifications(pushTokenStrings, title, body, data, sound, priority);

    // Log notification in DB
    await logNotifications(supabase, targetIds, notification_type || "system", title, body, data);

    return new Response(
      JSON.stringify({ success: true, sent: results.sent, failed: results.failed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(req) } }
    );
  }
});

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  sound = "default",
  priority: "default" | "normal" | "high" = "high"
): Promise<{ sent: number; failed: number }> {
  // Expo accepts up to 100 messages per request
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    const messages: PushMessage[] = batch.map((token) => ({
      to: token,
      title,
      body,
      data: data || {},
      sound,
      priority,
      channelId: "default",
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (res.ok) {
      const result = await res.json();
      const tickets = result.data || [];
      for (const ticket of tickets) {
        if (ticket.status === "ok") {
          sent++;
        } else {
          failed++;
        }
      }
    } else {
      failed += batch.length;
    }
  }

  return { sent, failed };
}

async function logNotifications(
  supabase: any,
  userIds: string[],
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    // Log in the notifications table (migration 11)
    const rows = userIds.map((uid) => ({
      recipient_id: uid,
      type,
      title,
      message: body,
      data: data || {},
      is_read: false,
      priority: "normal",
    }));
    await supabase.from("notifications").insert(rows);
  } catch {
    // Non-critical: don't fail the request if logging fails
  }
}
