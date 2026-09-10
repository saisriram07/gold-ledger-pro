UPDATE public.transactions SET profile_only = false WHERE profile_only = true;
ALTER TABLE public.transactions ALTER COLUMN profile_only SET DEFAULT false;