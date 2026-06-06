
CREATE OR REPLACE FUNCTION public.is_account_active(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE(
    (SELECT is_disabled FROM public.profiles WHERE user_id = _uid),
    false
  )
$$;

-- transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (
  (auth.uid() = user_id AND public.is_account_active(auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id AND public.is_account_active(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id AND public.is_account_active(auth.uid()));

-- profiles: prevent disabled users from updating their own profile (admins still can)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (
  (auth.uid() = user_id AND public.is_account_active(auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
