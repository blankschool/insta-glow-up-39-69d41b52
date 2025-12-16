-- Add stories and online_followers columns to account_snapshots table
ALTER TABLE public.account_snapshots 
ADD COLUMN IF NOT EXISTS stories jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS online_followers jsonb DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_snapshots_date ON public.account_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS idx_account_snapshots_user_account ON public.account_snapshots(user_id, instagram_user_id);