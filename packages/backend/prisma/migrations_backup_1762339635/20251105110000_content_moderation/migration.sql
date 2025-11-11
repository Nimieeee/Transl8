-- Create abuse reports table
CREATE TABLE "abuse_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- Create content flags table
CREATE TABLE "content_flags" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "abuse_reports_reporter_id_idx" ON "abuse_reports"("reporter_id");
CREATE INDEX "abuse_reports_status_idx" ON "abuse_reports"("status");
CREATE INDEX "abuse_reports_content_type_idx" ON "abuse_reports"("content_type");

CREATE INDEX "content_flags_status_idx" ON "content_flags"("status");
CREATE INDEX "content_flags_content_type_idx" ON "content_flags"("content_type");

-- Add foreign key constraint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
