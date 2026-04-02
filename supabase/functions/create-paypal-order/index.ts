import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Benutzer konnte nicht geladen werden.");
    }

    const body = await req.json();
    const returnUrl = String(body?.returnUrl || "");
    const cancelUrl = String(body?.cancelUrl || "");
    const itemName = String(body?.itemName || "Trailer-Tool Freischaltung");

    if (!returnUrl || !cancelUrl) {
      throw new Error("Return- oder Cancel-URL fehlt.");
    }

    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: user.id,
            reference_id: `trailer-upgrade-${user.id}`,
            description: itemName,
            amount: {
              currency_code: "EUR",
              value: "9.99",
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "TGSB-Materialverwaltung",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: returnUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "PayPal-Order konnte nicht erstellt werden.");
    }

    const approvalUrl =
      data?.links?.find((link: { rel?: string }) => link.rel === "payer-action")?.href ||
      data?.links?.find((link: { rel?: string }) => link.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("PayPal-Weiterleitungslink fehlt.");
    }

    return new Response(JSON.stringify({ orderId: data.id, approvalUrl }), {
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
