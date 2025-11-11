-- Add beta testing related tables and fields

-- Add beta tester flag and onboarding status to users
ALTER TABLE "User" ADD COLUMN "is_beta_tester" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "beta_onboarded_at" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "beta_invite_code" VARCHAR(50) UNIQUE;

-- Create feedback table
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50),
    "rating" INTEGER,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "status" VARCHAR(20) DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- Create analytics events table
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "event_name" VARCHAR(100) NOT NULL,
    "event_data" JSONB,
    "page_url" TEXT,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- Create support tickets table
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'open',
    "priority" VARCHAR(20) DEFAULT 'medium',
    "category" VARCHAR(50),
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- Create support ticket messages table
CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT,
    "message" TEXT NOT NULL,
    "is_staff" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Feedback_user_id_idx" ON "Feedback"("user_id");
CREATE INDEX "Feedback_type_idx" ON "Feedback"("type");
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");
CREATE INDEX "AnalyticsEvent_user_id_idx" ON "AnalyticsEvent"("user_id");
CREATE INDEX "AnalyticsEvent_event_name_idx" ON "AnalyticsEvent"("event_name");
CREATE INDEX "AnalyticsEvent_created_at_idx" ON "AnalyticsEvent"("created_at");
CREATE INDEX "SupportTicket_user_id_idx" ON "SupportTicket"("user_id");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicketMessage_ticket_id_idx" ON "SupportTicketMessage"("ticket_id");
