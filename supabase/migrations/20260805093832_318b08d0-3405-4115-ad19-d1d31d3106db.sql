-- ============ CHILD USERS ============
CREATE TABLE public.child_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  parent_user_id uuid NOT NULL,
  full_name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text,
  mobile text NOT NULL,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_users TO authenticated;
GRANT ALL ON public.child_users TO service_role;
ALTER TABLE public.child_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.child_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id uuid NOT NULL REFERENCES public.child_users(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_user_id, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_permissions TO authenticated;
GRANT ALL ON public.child_permissions TO service_role;
ALTER TABLE public.child_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.child_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id uuid NOT NULL,
  parent_user_id uuid NOT NULL,
  action text NOT NULL,
  module text,
  details jsonb,
  device text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.child_audit_logs TO authenticated;
GRANT ALL ON public.child_audit_logs TO service_role;
ALTER TABLE public.child_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.child_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id uuid NOT NULL,
  parent_user_id uuid NOT NULL,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  device text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.child_sessions TO authenticated;
GRANT ALL ON public.child_sessions TO service_role;
ALTER TABLE public.child_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_child_users_parent ON public.child_users(parent_user_id);
CREATE INDEX idx_child_perms_child ON public.child_permissions(child_user_id);
CREATE INDEX idx_child_audit_parent_time ON public.child_audit_logs(parent_user_id, created_at DESC);
CREATE INDEX idx_child_sessions_parent_time ON public.child_sessions(parent_user_id, login_at DESC);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.parent_owner_id(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT parent_user_id FROM public.child_users
  WHERE user_id = _uid AND is_disabled = false
$$;

CREATE OR REPLACE FUNCTION public.is_child_user(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_users WHERE user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.child_can(_uid uuid, _module text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.child_users cu
    JOIN public.child_permissions cp ON cp.child_user_id = cu.id
    WHERE cu.user_id = _uid
      AND cu.is_disabled = false
      AND cp.module = _module
      AND public.is_account_active(cu.parent_user_id)
      AND CASE _action
            WHEN 'view'   THEN cp.can_view
            WHEN 'create' THEN cp.can_create
            WHEN 'edit'   THEN cp.can_edit
            WHEN 'delete' THEN cp.can_delete
            ELSE false
          END
  )
$$;

REVOKE ALL ON FUNCTION public.parent_owner_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_child_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.child_can(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_owner_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_child_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.child_can(uuid, text, text) TO authenticated, service_role;

-- ============ POLICIES: child_users ============
CREATE POLICY "Parents manage own child users" ON public.child_users
  FOR ALL TO authenticated
  USING (parent_user_id = auth.uid() AND public.is_account_active(auth.uid()))
  WITH CHECK (parent_user_id = auth.uid() AND public.is_account_active(auth.uid()));

CREATE POLICY "Child can view own row" ON public.child_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view child users" ON public.child_users
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ POLICIES: child_permissions ============
CREATE POLICY "Parents manage child permissions" ON public.child_permissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.child_users cu WHERE cu.id = child_user_id AND cu.parent_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_users cu WHERE cu.id = child_user_id AND cu.parent_user_id = auth.uid()));

CREATE POLICY "Child views own permissions" ON public.child_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.child_users cu WHERE cu.id = child_user_id AND cu.user_id = auth.uid()));

-- ============ POLICIES: child_audit_logs ============
CREATE POLICY "Parents view child audit logs" ON public.child_audit_logs
  FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "Child inserts own audit logs" ON public.child_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (child_user_id = auth.uid() AND parent_user_id = public.parent_owner_id(auth.uid()));

CREATE POLICY "Child views own audit logs" ON public.child_audit_logs
  FOR SELECT TO authenticated
  USING (child_user_id = auth.uid());

-- ============ POLICIES: child_sessions ============
CREATE POLICY "Parents view child sessions" ON public.child_sessions
  FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "Child inserts own session" ON public.child_sessions
  FOR INSERT TO authenticated
  WITH CHECK (child_user_id = auth.uid() AND parent_user_id = public.parent_owner_id(auth.uid()));

CREATE POLICY "Child updates own session" ON public.child_sessions
  FOR UPDATE TO authenticated
  USING (child_user_id = auth.uid())
  WITH CHECK (child_user_id = auth.uid());

-- ============ CHILD ACCESS TO PARENT DATA ============
CREATE POLICY "Child views parent customers" ON public.customers
  FOR SELECT TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'customers', 'view'));

CREATE POLICY "Child inserts parent customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'customers', 'create'));

CREATE POLICY "Child updates parent customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'customers', 'edit'));

CREATE POLICY "Child deletes parent customers" ON public.customers
  FOR DELETE TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'customers', 'delete'));

CREATE POLICY "Child views parent transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'total_records', 'view'));

CREATE POLICY "Child inserts parent transactions" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'new_transaction', 'create'));

CREATE POLICY "Child updates parent transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'total_records', 'edit'));

CREATE POLICY "Child deletes parent transactions" ON public.transactions
  FOR DELETE TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'total_records', 'delete'));

CREATE POLICY "Child views parent jama" ON public.jama_payments
  FOR SELECT TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'jama', 'view'));

CREATE POLICY "Child inserts parent jama" ON public.jama_payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'jama', 'create'));

CREATE POLICY "Child updates parent jama" ON public.jama_payments
  FOR UPDATE TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'jama', 'edit'));

CREATE POLICY "Child deletes parent jama" ON public.jama_payments
  FOR DELETE TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()) AND public.child_can(auth.uid(), 'jama', 'delete'));

CREATE POLICY "Child views parent profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = public.parent_owner_id(auth.uid()));

-- ============ TRIGGERS ============
CREATE TRIGGER trg_child_users_updated_at BEFORE UPDATE ON public.child_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_child_permissions_updated_at BEFORE UPDATE ON public.child_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
