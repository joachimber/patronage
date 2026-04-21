CREATE TYPE "public"."grant_status" AS ENUM('active', 'revoked', 'error');--> statement-breakpoint
CREATE TYPE "public"."plugin_id" AS ENUM('web', 'files', 'telegram', 'email');--> statement-breakpoint
CREATE TABLE "creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" varchar(64) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"tagline" varchar(240),
	"bio" text,
	"wallet" varchar(64) NOT NULL,
	"token_mint" varchar(64),
	"token_ticker" varchar(24),
	"token_name" varchar(120),
	"token_image_url" text,
	"token_decimals" integer DEFAULT 9,
	"partner_bps" integer DEFAULT 100,
	"accent_color" varchar(16) DEFAULT '#C1272D',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creators_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_id" uuid NOT NULL,
	"filename" varchar(256) NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" varchar(128),
	"size_bytes" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holder_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"plugin_id" "plugin_id" NOT NULL,
	"external_ref" varchar(256),
	"status" "grant_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "holders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" varchar(64) NOT NULL,
	"creator_id" uuid NOT NULL,
	"current_tier_id" uuid,
	"last_balance" bigint DEFAULT 0,
	"last_verified_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holders_wallet_creator_uniq" UNIQUE("wallet","creator_id")
);
--> statement-breakpoint
CREATE TABLE "nonces" (
	"wallet" varchar(64) NOT NULL,
	"nonce" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_id" uuid NOT NULL,
	"plugin_id" "plugin_id" NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" varchar(64) NOT NULL,
	"role" varchar(16) DEFAULT 'holder' NOT NULL,
	"creator_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"threshold" bigint NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"url" text NOT NULL,
	"title" varchar(240),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grants" ADD CONSTRAINT "grants_holder_id_holders_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grants" ADD CONSTRAINT "grants_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holders" ADD CONSTRAINT "holders_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holders" ADD CONSTRAINT "holders_current_tier_id_tiers_id_fk" FOREIGN KEY ("current_tier_id") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perks" ADD CONSTRAINT "perks_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_content" ADD CONSTRAINT "web_content_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creators_wallet_idx" ON "creators" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "creators_mint_idx" ON "creators" USING btree ("token_mint");--> statement-breakpoint
CREATE INDEX "grants_holder_idx" ON "grants" USING btree ("holder_id");--> statement-breakpoint
CREATE INDEX "holders_wallet_idx" ON "holders" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "perks_tier_idx" ON "perks" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "tiers_creator_idx" ON "tiers" USING btree ("creator_id","position");