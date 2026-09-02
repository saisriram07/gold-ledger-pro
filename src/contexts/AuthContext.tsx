import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleKey, PermissionAction, PermissionRow } from "@/lib/permissions";

type Profile = {
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string | null;
  is_disabled: boolean;
};

type ChildUser = {
  id: string;
  user_id: string;
  parent_user_id: string;
  full_name: string;
  username: string;
  is_disabled: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  isDisabled: boolean;
  /** True when the signed-in account is a staff (child) login. */
  isChild: boolean;
  childUser: ChildUser | null;
  childPermissions: PermissionRow[];
  /** Owner of the data this session works with (parent id for child logins). */
  dataOwnerId: string | null;
  can: (module: ModuleKey, action?: PermissionAction) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  isDisabled: false,
  isChild: false,
  childUser: null,
  childPermissions: [],
  dataOwnerId: null,
  can: () => true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [childUser, setChildUser] = useState<ChildUser | null>(null);
  const [childPermissions, setChildPermissions] = useState<PermissionRow[]>([]);
  const sessionRowId = useRef<string | null>(null);

  const fetchChild = async (userId: string) => {
    const { data } = await supabase
      .from("child_users")
      .select("id, user_id, parent_user_id, full_name, username, is_disabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) {
      setChildUser(null);
      setChildPermissions([]);
      return null;
    }
    setChildUser(data as ChildUser);
    const { data: perms } = await supabase
      .from("child_permissions")
      .select("module, can_view, can_create, can_edit, can_delete")
      .eq("child_user_id", data.id);
    setChildPermissions((perms as PermissionRow[]) ?? []);
    return data as ChildUser;
  };

  const fetchProfile = async (userId: string, child: ChildUser | null) => {
    // A child login reads the parent shop profile so branding stays intact.
    const ownerId = child?.parent_user_id ?? userId;
    const { data } = await supabase
      .from("profiles")
      .select("shop_name, owner_name, phone, address, is_disabled")
      .eq("user_id", ownerId)
      .maybeSingle();
    setProfile(data ?? null);
    setIsDisabled((data?.is_disabled ?? false) || (child?.is_disabled ?? false));
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const openChildSession = async (child: ChildUser) => {
    if (sessionRowId.current) return;
    const { data } = await supabase
      .from("child_sessions")
      .insert({
        child_user_id: child.user_id,
        parent_user_id: child.parent_user_id,
        device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      })
      .select("id")
      .maybeSingle();
    if (data?.id) sessionRowId.current = data.id;
    await supabase.from("child_audit_logs").insert({
      child_user_id: child.user_id,
      parent_user_id: child.parent_user_id,
      action: "Login",
      module: "dashboard",
      device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  };

  // Guards against duplicate hydration: onAuthStateChange fires for
  // INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED and getSession() resolves too,
  // which previously re-fetched child_users + profiles + user_roles 3x per load.
  const hydratedFor = useRef<string | null>(null);
  const hydrate = async (userId: string, force = false) => {
    if (!force && hydratedFor.current === userId) return;
    hydratedFor.current = userId;
    const child = await fetchChild(userId);
    await fetchProfile(userId, child);
    await fetchRole(userId);
    if (child && !child.is_disabled) await openChildSession(child);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const uid = session.user.id;
          setTimeout(async () => {
            await hydrate(uid);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsDisabled(false);
          setChildUser(null);
          setChildPermissions([]);
          sessionRowId.current = null;
          hydratedFor.current = null;
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        hydrate(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const can = useCallback(
    (module: ModuleKey, action: PermissionAction = "view") => {
      // Parents and admins keep unrestricted access to their own scope.
      if (!childUser) return true;
      if (childUser.is_disabled) return false;
      // Staff logins can never reach Settings / user management.
      if (module === "settings") return false;
      const row = childPermissions.find((p) => p.module === module);
      if (!row) return false;
      switch (action) {
        case "view": return row.can_view || row.can_create || row.can_edit || row.can_delete;
        case "create": return row.can_create;
        case "edit": return row.can_edit;
        case "delete": return row.can_delete;
        default: return false;
      }
    },
    [childUser, childPermissions],
  );

  const signOut = async () => {
    if (childUser) {
      const rowId = sessionRowId.current;
      if (rowId) {
        await supabase.from("child_sessions").update({ logout_at: new Date().toISOString() }).eq("id", rowId);
      }
      await supabase.from("child_audit_logs").insert({
        child_user_id: childUser.user_id,
        parent_user_id: childUser.parent_user_id,
        action: "Logout",
        device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      });
    }
    sessionRowId.current = null;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        isDisabled,
        isChild: !!childUser,
        childUser,
        childPermissions,
        dataOwnerId: childUser?.parent_user_id ?? user?.id ?? null,
        can,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
