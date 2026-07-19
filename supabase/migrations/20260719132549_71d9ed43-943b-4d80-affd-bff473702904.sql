
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gold_item_name text,
  ADD COLUMN IF NOT EXISTS gold_weight text,
  ADD COLUMN IF NOT EXISTS gold_amount numeric,
  ADD COLUMN IF NOT EXISTS gold_rate numeric,
  ADD COLUMN IF NOT EXISTS silver_item_name text,
  ADD COLUMN IF NOT EXISTS silver_weight text,
  ADD COLUMN IF NOT EXISTS silver_amount numeric,
  ADD COLUMN IF NOT EXISTS silver_rate numeric;
