import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://insta-glow-up-39.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const isDevOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    const m = url.hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (m) {
      const secondOctet = Number(m[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }
    return false;
  } catch {
    return false;
  }
};

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = !!origin && (allowedOrigins.includes(origin) || isDevOrigin(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dev-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`[seed-test-account][${requestId}] Request started`);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const testIgUserId = Deno.env.get("TEST_IG_USER_ID");
    const testAccessToken = Deno.env.get("TEST_IG_ACCESS_TOKEN");
    const testUsername = Deno.env.get("TEST_IG_USERNAME");
    const testTokenExpiresAt = Deno.env.get("TEST_IG_TOKEN_EXPIRES_AT");

    if (!isNonEmptyString(testIgUserId) || !isNonEmptyString(testAccessToken)) {
      throw new Error("Missing TEST_IG_USER_ID / TEST_IG_ACCESS_TOKEN secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();
    const tokenExpiresAt = isNonEmptyString(testTokenExpiresAt)
      ? testTokenExpiresAt
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // Ensure profile row exists (older users created before the trigger/migration can be missing it).
    const { error: profileUpsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          updated_at: now,
        },
        { onConflict: "id" },
      );
    if (profileUpsertError) throw profileUpsertError;

    const { data: row, error } = await supabase
      .from("connected_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "facebook",
          provider_account_id: testIgUserId,
          access_token: testAccessToken,
          token_expires_at: tokenExpiresAt,
          account_username: isNonEmptyString(testUsername) ? testUsername : null,
          account_name: null,
          profile_picture_url: null,
          updated_at: now,
        },
        { onConflict: "user_id,provider,provider_account_id" },
      )
      .select("id, provider, provider_account_id, account_username, token_expires_at, updated_at")
      .maybeSingle();

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log(`[seed-test-account][${requestId}] Success in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        connected_account: row,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const duration = Date.now() - startTime;
    console.error(`[seed-test-account][${requestId}] Error after ${duration}ms:`, msg);
    const status = msg === "Missing authorization" || msg === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ success: false, error: msg, request_id: requestId }),
      {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      },
    );
  }
});
