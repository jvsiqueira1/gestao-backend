-- Remove billing/subscription fields (Stripe sunset, single-user mode)
ALTER TABLE "users" DROP COLUMN IF EXISTS "subscription_status";
ALTER TABLE "users" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "users" DROP COLUMN IF EXISTS "premium_until";
ALTER TABLE "users" DROP COLUMN IF EXISTS "trial_end";
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";
