CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"uploader_id" uuid,
	"storage_key" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "fitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vin" text,
	"brand" text,
	"model" text,
	"year" integer,
	"trim" text,
	"oe" text NOT NULL,
	"part_type_id" text,
	"source" text NOT NULL,
	"result" text NOT NULL,
	"order_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"created_by" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"oe" text,
	"manufacturer" text,
	"kind" text NOT NULL,
	"condition" text,
	"qty" integer DEFAULT 1 NOT NULL,
	"price_kzt" integer NOT NULL,
	"lead_days_min" integer NOT NULL,
	"lead_days_max" integer NOT NULL,
	"fitment" text DEFAULT 'needs_check' NOT NULL,
	"note" text,
	"price_cny" numeric(12, 2),
	"cost_kzt" integer,
	"supplier_name" text,
	"supplier_url" text,
	"internal_note" text,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"customer_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"total_kzt" integer NOT NULL,
	"fit_feedback" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_offer_id_unique" UNIQUE("offer_id")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "part_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"assigned_to" uuid,
	"status" text DEFAULT 'new' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"part_type_id" text,
	"axis" text,
	"side" text,
	"oe" text,
	"qty" integer DEFAULT 1 NOT NULL,
	"vehicle_snapshot" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_requests_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "provider_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"result" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"mode" text NOT NULL,
	"input_mask" text NOT NULL,
	"status" text NOT NULL,
	"provider_code" integer,
	"duration_ms" integer NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" uuid,
	"kind" text DEFAULT 'message' NOT NULL,
	"body" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"company" text,
	"city" text,
	"locale" text DEFAULT 'ru' NOT NULL,
	"telegram_chat_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"vin" text,
	"label" text,
	"brand" text,
	"model" text,
	"year" integer,
	"trim" text,
	"epc" text,
	"epc_id" text,
	"build_date" text,
	"decode_status" text DEFAULT 'pending' NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_candidate_id" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitments" ADD CONSTRAINT "fitments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitments" ADD CONSTRAINT "fitments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_calls" ADD CONSTRAINT "provider_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_request_id_part_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."part_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attachments_request" ON "attachments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_fitments_oe" ON "fitments" USING btree ("oe");--> statement-breakpoint
CREATE INDEX "idx_fitments_vin" ON "fitments" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "idx_offers_request" ON "offers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_order_events_order" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_otp_phone" ON "otp_codes" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "idx_requests_customer" ON "part_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_requests_status" ON "part_requests" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_requests_assigned" ON "part_requests" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_provider_calls_day" ON "provider_calls" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_request" ON "request_messages" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_owner" ON "vehicles" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vehicles_owner_vin" ON "vehicles" USING btree ("owner_id","vin");