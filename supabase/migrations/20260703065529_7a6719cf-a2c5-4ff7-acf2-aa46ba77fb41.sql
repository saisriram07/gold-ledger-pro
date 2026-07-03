-- Performance indexes for transactions table.
-- All queries in the app filter by user_id (RLS) and sort/filter by date; reminders filter by date age; status filters are common.
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON public.transactions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_item_type ON public.transactions (user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reminder_date ON public.transactions (reminder_date) WHERE reminder_date IS NOT NULL;

-- Roles lookup happens on every auth state change via has_role() — index for O(1) lookup.
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Profiles: admin panel lists all; auth context fetches by user_id every session.
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);