import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PermissionRow } from "@/lib/permissions";

export type ChildUser = {
  id: string;
  user_id: string;
  parent_user_id: string;
  full_name: string;
  username: string;
  email: string | null;
  mobile: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ChildSession = {
  id: string;
  child_user_id: string;
  login_at: string;
  logout_at: string | null;
  device: string | null;
  ip_address: string | null;
};

export type AuditLog = {
  id: string;
  child_user_id: string;
  action: string;
  module: string | null;
  details: any;
  device: string | null;
  ip_address: string | null;
  created_at: string;
};

type ManagePayload = Record<string, unknown> & { action: string };

async function callManage(payload: ManagePayload) {
  const { data, error } = await supabase.functions.invoke("manage-child-user", { body: payload });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useChildUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const children = useQuery({
    queryKey: ["child-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ChildUser[];
    },
    enabled: !!user,
  });

  const permissions = useQuery({
    queryKey: ["child-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("child_permissions").select("*");
      if (error) throw error;
      return data as (PermissionRow & { id: string; child_user_id: string })[];
    },
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["child-users"] });
    qc.invalidateQueries({ queryKey: ["child-permissions"] });
  };

  const createChild = useMutation({
    mutationFn: (p: {
      full_name: string; username: string; email?: string | null; mobile: string;
      password: string; is_disabled: boolean; permissions: PermissionRow[];
    }) => callManage({ action: "create", ...p }),
    onSuccess: () => { invalidate(); toast.success("Child user created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateChild = useMutation({
    mutationFn: (p: {
      child_id: string; full_name: string; email?: string | null; mobile: string;
      is_disabled: boolean; permissions: PermissionRow[];
    }) => callManage({ action: "update", ...p }),
    onSuccess: () => { invalidate(); toast.success("Child user updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleChild = useMutation({
    mutationFn: (p: { child_id: string; is_disabled: boolean }) =>
      callManage({ action: "toggle", ...p }),
    onSuccess: (_d, v) => { invalidate(); toast.success(v.is_disabled ? "Child user disabled" : "Child user enabled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: (p: { child_id: string; password: string }) =>
      callManage({ action: "reset_password", ...p }),
    onSuccess: () => toast.success("Password reset"),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteChild = useMutation({
    mutationFn: (child_id: string) => callManage({ action: "delete", child_id }),
    onSuccess: () => { invalidate(); toast.success("Child user deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { children, permissions, createChild, updateChild, toggleChild, resetPassword, deleteChild };
}

export function useChildActivity() {
  const { user } = useAuth();

  const logs = useQuery({
    queryKey: ["child-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!user,
  });

  const sessions = useQuery({
    queryKey: ["child-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("child_sessions")
        .select("*")
        .order("login_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as ChildSession[];
    },
    enabled: !!user,
  });

  return { logs, sessions };
}
