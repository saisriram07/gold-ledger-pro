CREATE INDEX IF NOT EXISTS idx_jama_user_tx_date ON public.jama_payments (user_id, transaction_id, paid_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON public.transactions (user_id, item_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_customer ON public.transactions (user_id, customer_id);
ANALYZE public.transactions;
ANALYZE public.jama_payments;