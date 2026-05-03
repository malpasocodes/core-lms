CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferred_name" text,
	"timezone" text,
	"location" text,
	"linkedin" text,
	"bio" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;