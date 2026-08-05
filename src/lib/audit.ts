import { supabase } from "@/integrations/supabase/client";

/**
 * Records a child-user activity. No-ops for parent/admin accounts so audit logs
 * stay a pure child-activity trail. Failures are swallowed: auditing must never
 * break a user action.
 */
export async function logChildAction(opts: {
  childUserId: string | null;
  parentUserId: string | null;
  action: string;
  module?: string | null;
  details?: Record<string, unknown> | null;
}) {
  if (!opts.childUserId || !opts.parentUserId) return;
  try {
    await supabase.from("child_audit_logs").insert({
      child_user_id: opts.childUserId,
      parent_user_id: opts.parentUserId,
      action: opts.action,
      module: opts.module ?? null,
      details: (opts.details ?? null) as any,
      device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    /* auditing is best-effort */
  }
}
