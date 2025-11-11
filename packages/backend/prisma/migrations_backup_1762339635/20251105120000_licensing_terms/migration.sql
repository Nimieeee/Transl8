-- Add licensing terms fields to users table
ALTER TABLE "users" ADD COLUMN "licensing_terms_accepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "licensing_terms_version" TEXT;
ALTER TABLE "users" ADD COLUMN "licensing_terms_accepted_at" TIMESTAMP(3);

-- Add consent fields to voice_clones table
ALTER TABLE "voice_clones" ADD COLUMN "consent_given" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "voice_clones" ADD COLUMN "consent_date" TIMESTAMP(3);
