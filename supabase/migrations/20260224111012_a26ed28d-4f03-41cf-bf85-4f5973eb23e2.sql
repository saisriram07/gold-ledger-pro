
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS completed_date date;
