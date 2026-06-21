import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side admin invite code. Required — no insecure fallback.
const ADMIN_INVITE_CODE = Deno.env.get("ADMIN_INVITE_CODE");

// Simple in-memory per-IP rate limiter (best-effort; resets on cold start).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255;
}

function clampStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = isEmail(body.email) ? (body.email as string).trim().toLowerCase() : null;
    const password = typeof body.password === "string" ? body.password : null;
    const shop_name = clampStr(body.shop_name, 150);
    const owner_name = clampStr(body.owner_name, 100);
    const phone = clampStr(body.phone, 30);
    const address = body.address == null ? null : clampStr(body.address, 500);
    const requestedRole = body.role === "admin" ? "admin" : "user";
    const inviteCode = typeof body.invite_code === "string" ? body.invite_code : "";

    if (!email || !password || !shop_name || !owner_name || !phone) {
      return new Response(JSON.stringify({ error: "Missing or invalid required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6 || password.length > 200) {
      return new Response(JSON.stringify({ error: "Password must be 6-200 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side authorization for admin role assignment.
    if (requestedRole === "admin" && inviteCode !== ADMIN_INVITE_CODE) {
      return new Response(JSON.stringify({ error: "Invalid admin invite code" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !userData?.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Could not create user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      user_id: userId, shop_name, owner_name, phone, address, email,
    });
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create profile" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId, role: requestedRole,
    });
    if (roleErr) {
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to assign role" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    // Do not leak internal errors to the client.
    return new Response(JSON.stringify({ error: "Registration failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
