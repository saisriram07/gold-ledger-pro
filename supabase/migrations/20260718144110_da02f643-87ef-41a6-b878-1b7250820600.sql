
-- 1. CUSTOMERS TABLE
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  father_name text,
  phone text NOT NULL,
  area text,
  address text,
  age integer,
  photo_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own customers" ON public.customers
  FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own customers" ON public.customers
  FOR INSERT WITH CHECK ((auth.uid() = user_id) AND public.is_account_active(auth.uid()));
CREATE POLICY "Users update own customers" ON public.customers
  FOR UPDATE USING ((auth.uid() = user_id) AND public.is_account_active(auth.uid()));
CREATE POLICY "Users delete own customers" ON public.customers
  FOR DELETE USING ((auth.uid() = user_id) AND public.is_account_active(auth.uid()));
CREATE POLICY "Admins delete customers" ON public.customers
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_phone ON public.customers(user_id, phone);
CREATE INDEX idx_customers_name ON public.customers(user_id, name);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. EXTEND TRANSACTIONS
ALTER TABLE public.transactions
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN loan_type text,
  ADD COLUMN interest_rate numeric,
  ADD COLUMN principal_amount numeric,
  ADD COLUMN photo_url text;

CREATE INDEX idx_transactions_customer_id ON public.transactions(customer_id);

-- Backfill principal_amount from existing amount
UPDATE public.transactions SET principal_amount = amount WHERE principal_amount IS NULL;

-- 3. JAMA PAYMENTS
CREATE TABLE public.jama_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  paid_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL CHECK (amount > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jama_payments TO authenticated;
GRANT ALL ON public.jama_payments TO service_role;
ALTER TABLE public.jama_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own jama" ON public.jama_payments
  FOR SELECT USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own jama" ON public.jama_payments
  FOR INSERT WITH CHECK ((auth.uid() = user_id) AND public.is_account_active(auth.uid()));
CREATE POLICY "Users update own jama" ON public.jama_payments
  FOR UPDATE USING ((auth.uid() = user_id) AND public.is_account_active(auth.uid()));
CREATE POLICY "Users delete own jama" ON public.jama_payments
  FOR DELETE USING ((auth.uid() = user_id) AND public.is_account_active(auth.uid()));

CREATE INDEX idx_jama_transaction_id ON public.jama_payments(transaction_id);
CREATE INDEX idx_jama_user_id ON public.jama_payments(user_id);

-- 4. AUTO SERIAL FUNCTION (per shop, never resets)
CREATE OR REPLACE FUNCTION public.next_serial_no(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(serial_no, '\D', '', 'g'), '')::int),
    0
  ) + 1
  FROM public.transactions
  WHERE user_id = _uid;
$$;

REVOKE ALL ON FUNCTION public.next_serial_no(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_serial_no(uuid) TO authenticated;
