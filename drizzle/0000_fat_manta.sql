CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"label" text NOT NULL,
	"prefix" text NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	CONSTRAINT "api_keys_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_hash" text NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "authors_subject_hash_unique" UNIQUE("subject_hash"),
	CONSTRAINT "authors_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"paper_id" text NOT NULL,
	"author" text NOT NULL,
	"author_id" text,
	"body" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" text NOT NULL,
	"owner_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_transparency" (
	"paper_id" text PRIMARY KEY NOT NULL,
	"declared_models" text DEFAULT '[]' NOT NULL,
	"model_scan" text DEFAULT '{"status":"not_scanned","mentions":[],"pagesScanned":0}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"author_id" text,
	"abstract" text NOT NULL,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" text NOT NULL,
	"method" text DEFAULT '' NOT NULL,
	"limitations" text DEFAULT '' NOT NULL,
	"ai_use" text DEFAULT '' NOT NULL,
	"license" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"external_pdf_url" text DEFAULT '' NOT NULL,
	"published_at" text DEFAULT '' NOT NULL,
	"page_count" integer,
	"file_key" text NOT NULL,
	"file_size" integer NOT NULL,
	"owner_hash" text NOT NULL,
	"withdrawn" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_hash" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"pathname" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"created_at" text NOT NULL,
	"consumed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_keys_author" ON "api_keys" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_comments_paper_created" ON "comments" USING btree ("paper_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_papers_created_at" ON "papers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_submissions_actor_time" ON "submissions" USING btree ("actor_hash","created_at");