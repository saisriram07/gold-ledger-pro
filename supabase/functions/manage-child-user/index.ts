import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CHILD_EMAIL_DOMAIN = "childuser.local";
const MODULES = [
  "dashboard", "customers", "new_transaction", "total_records", "gold_records",
  "silver_records", "combination_records", "jama", "reports", "reminders",
  "whatsapp", "sms", "settings",
];

// Best-effort per-IP rate limit (resets on cold start).
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();
function allowed(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT_MAX) return false;
  b.count++;
  return true;
}

const clamp = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
};

const normalizeUsername = (u: string) => u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

function sanitizePermissions(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object" && MODULES.includes((p as any).module))
    .map((p: any) => ({
      module: p.module as string,
      can_view: !!p.can_view,
      can_create: !!p.can_create,
      can_edit: !!p.can_edit,
      can_delete: !!p.can_delete,
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return json({ error: "Too many requests. Please try again later." }, 429);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    const caller = userData?.user;
    if (userErr || !caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // A child login can never manage users.
    const { data: callerIsChild } = await admin
      .from("child_users").select("id").eq("user_id", caller.id).maybeSingle();
    if (callerIsChild) return json({ error: "Child users cannot manage users" }, 403);

    // The caller must be an active shop owner.
    const { data: parentProfile } = await admin
      .from("profiles").select("user_id, is_disabled").eq("user_id", caller.id).maybeSingle();
    if (!parentProfile) return json({ error: "Shop profile not found" }, 403);
    if (parentProfile.is_disabled) return json({ error: "Your account is suspended" }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);
    const action = body.action;

    // Resolve + authorize the target child for every non-create action.
    let child: { id: string; user_id: string } | null = null;
    if (action !== "create") {
      const childId = clamp(body.child_id, 64);
      if (!childId) return json({ error: "child_id is required" }, 400);
      const { data } = await admin
        .from("child_users").select("id, user_id, parent_user_id").eq("id", childId).maybeSingle();
      if (!data || data.parent_user_id !== caller.id) return json({ error: "Child user not found" }, 404);
      child = { id: data.id, user_id: data.user_id };
    }

    if (action === "create") {
      const full_name = clamp(body.full_name, 100);
      const usernameRaw = clamp(body.username, 50);
      const mobile = clamp(body.mobile, 20);
      const email = body.email == null || body.email === "" ? null : clamp(body.email, 255);
      const password = typeof body.password === "string" ? body.password : "";
      if (!full_name || !usernameRaw || !mobile) return json({ error: "Full name, username and mobile are required" }, 400);
      if (password.length < 6 || password.length > 200) return json({ error: "Password must be 6-200 characters" }, 400);
      if (!/^\d{10}$/.test(mobile)) return json({ error: "Mobile number must be exactly 10 digits" }, 400);

      const username = normalizeUsername(usernameRaw);
      if (username.length < 3) return json({ error: "Username must be at least 3 valid characters" }, 400);

      const { data: existing } = await admin
        .from("child_users").select("id").eq("username", username).maybeSingle();
      if (existing) return json({ error: "That username is already taken" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: `${username}@${CHILD_EMAIL_DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { child_of: caller.id, full_name },
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "Could not create login" }, 400);

      const { data: row, error: rowErr } = await admin.from("child_users").insert({
        user_id: created.user.id,
        parent_user_id: caller.id,
        full_name, username, email, mobile,
        is_disabled: !!body.is_disabled,
      }).select("id").single();
      if (rowErr || !row) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "Failed to create child user" }, 500);
      }

      const perms = sanitizePermissions(body.permissions);
      if (perms.length) {
        const { error: permErr } = await admin
          .from("child_permissions")
          .insert(perms.map((p) => ({ ...p, child_user_id: row.id })));
        if (permErr) return json({ error: "Child created but permissions failed to save" }, 500);
      }
      return json({ success: true, child_id: row.id });
    }

    if (action === "update") {
      const full_name = clamp(body.full_name, 100);
      const mobile = clamp(body.mobile, 20);
      const email = body.email == null || body.email === "" ? null : clamp(body.email, 255);
      if (!full_name || !mobile) return json({ error: "Full name and mobile are required" }, 400);
      if (!/^\d{10}$/.test(mobile)) return json({ error: "Mobile number must be exactly 10 digits" }, 400);

      const { error: updErr } = await admin.from("child_users")
        .update({ full_name, mobile, email, is_disabled: !!body.is_disabled })
        .eq("id", child!.id);
      if (updErr) return json({ error: "Failed to update child user" }, 500);

      const perms = sanitizePermissions(body.permissions);
      if (perms.length) {
        const { error: permErr } = await admin.from("child_permissions")
          .upsert(perms.map((p) => ({ ...p, child_user_id: child!.id })), { onConflict: "child_user_id,module" });
        if (permErr) return json({ error: "Failed to save permissions" }, 500);
      }
      return json({ success: true });
    }

    if (action === "toggle") {
      const { error } = await admin.from("child_users")
        .update({ is_disabled: !!body.is_disabled }).eq("id", child!.id);
      if (error) return json({ error: "Failed to change status" }, 500);
      return json({ success: true });
    }

    if (action === "reset_password") {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 6 || password.length > 200) return json({ error: "Password must be 6-200 characters" }, 400);
      const { error } = await admin.auth.admin.updateUserById(child!.user_id, { password });
      if (error) return json({ error: "Failed to reset password" }, 500);
      return json({ success: true });
    }

    if (action === "delete") {
      await admin.from("child_permissions").delete().eq("child_user_id", child!.id);
      await admin.from("child_users").delete().eq("id", child!.id);
      const { error } = await admin.auth.admin.deleteUser(child!.user_id);
      if (error) return json({ error: "Failed to delete login" }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (_err) {
    return json({ error: "Request failed" }, 500);
  }
});
