-- Remove plaintext password storage
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_display;

-- Prevent privilege escalation: remove self-insert on user_roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Admins can insert user_roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Lock down trigger helper function from being callable by clients
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;