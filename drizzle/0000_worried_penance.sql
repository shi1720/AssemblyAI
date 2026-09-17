CREATE TABLE `cores` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`purchase_key` text NOT NULL,
	`data` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_event_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cores_owner` ON `cores` (`owner`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_core_purchase` ON `cores` (`owner`,`purchase_key`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`core_id` text NOT NULL,
	`request_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_owner_core` ON `events` (`owner`,`core_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_events_request` ON `events` (`owner`,`request_id`);--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_policies_owner` ON `policies` (`owner`);--> statement-breakpoint
CREATE TABLE `quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`core_id` text NOT NULL,
	`created_at` text NOT NULL,
	`ended_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_owner` ON `sessions` (`owner`);--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`owner` text NOT NULL,
	`core_id` text NOT NULL,
	`speaker` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_transcripts_owner_core` ON `transcripts` (`owner`,`core_id`);