CREATE TABLE `credit_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`core_id` text NOT NULL,
	`source_key` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`reversed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_credit_source_active` ON `credit_allocations` (`owner`,`source_key`) WHERE "credit_allocations"."reversed" = 0;--> statement-breakpoint
CREATE INDEX `idx_credit_core` ON `credit_allocations` (`owner`,`core_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `fingerprint` text DEFAULT '' NOT NULL;