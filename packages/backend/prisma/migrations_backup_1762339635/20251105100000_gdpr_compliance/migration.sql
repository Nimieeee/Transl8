-- Add GDPR consent fields to users table
ALTER TABLE "users" ADD COLUMN "gdpr_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "gdpr_consent_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "cookie_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "cookie_consent_date" TIMESTAMP(3);

-- Create subscription history table for GDPR compliance
CREATE TABLE "subscription_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "stripe_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

-- Create index on user_id for subscription history
CREATE INDEX "subscription_history_user_id_idx" ON "subscription_history"("user_id");

-- Add foreign key constraint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
