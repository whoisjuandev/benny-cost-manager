ALTER TABLE `suppliers` ADD `contact` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `lead_time_days` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `active` integer DEFAULT true NOT NULL;