
-- Add email column to profiles to display in admin panel
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Add password_display column to profiles (for admin viewing only)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_display text;
