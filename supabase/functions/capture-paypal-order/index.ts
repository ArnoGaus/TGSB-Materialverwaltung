import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
const paypalEnv = (Deno.env.get("PAYPAL_ENV") ?? "live").toLowerCase();
const paypalBaseUrl = paypalEnv === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function getPaypalAccessToken() {
  const encoded = btoa(`${paypalClientId}:${paypalClientSecret}`);
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "PayPal-Token konnte nicht geladen werden.");
  }

  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Nicht authentifiziert.");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Benutzer konnte nicht geladen werden.");
    }

    const body = await req.json();
    const orderId = String(body?.orderId || "");
    if (!orderId) {
      throw new Error("Order-ID fehlt.");
    }

    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "PayPal-Order konnte nicht bestätigt werden.");
    }

    const purchaseUnit = data?.purchase_units?.[0];
    const customId = purchaseUnit?.custom_id;
    const captureStatus = purchaseUnit?.payments?.captures?.[0]?.status;

    if (!customId || customId !== user.id) {
      throw new Error("Die Zahlung gehört nicht zum aktuellen Profil.");
    }

    if (data?.status !== "COMPLETED" && captureStatus !== "COMPLETED") {
      throw new Error("Die Zahlung wurde noch nicht erfolgreich abgeschlossen.");
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        trailer_tool_unlocked: true,
        trailer_tool_unlocked_at: new Date().toISOString(),
        trailer_tool_payment_provider: "paypal",
        trailer_tool_payment_id: orderId,
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ unlocked: true, orderId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
