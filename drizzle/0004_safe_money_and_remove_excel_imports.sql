DROP TABLE IF EXISTS `excel_imports`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ingredients` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `sku` text,
  `category` text NOT NULL,
  `supplier_id` text,
  `purchase_presentation_label` text,
  `purchase_quantity` real NOT NULL,
  `purchase_unit` text NOT NULL,
  `usage_unit` text NOT NULL,
  `purchase_price` integer NOT NULL,
  `waste_pct` real DEFAULT 0 NOT NULL,
  `correction_factor` real DEFAULT 1 NOT NULL,
  `min_daily_consumption` real DEFAULT 0 NOT NULL,
  `max_daily_consumption` real DEFAULT 0 NOT NULL,
  `current_stock` real DEFAULT 0 NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
  `updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_ingredients` SELECT `id`, `name`, `sku`, `category`, `supplier_id`, `purchase_presentation_label`, `purchase_quantity`, `purchase_unit`, `usage_unit`, CAST(ROUND(`purchase_price` * 100) AS INTEGER), `waste_pct`, `correction_factor`, `min_daily_consumption`, `max_daily_consumption`, `current_stock`, `active`, `created_at`, `updated_at` FROM `ingredients`;--> statement-breakpoint
DROP TABLE `ingredients`;--> statement-breakpoint
ALTER TABLE `__new_ingredients` RENAME TO `ingredients`;--> statement-breakpoint

CREATE TABLE `__new_monthly_ledger_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `monthly_ledger_id` text NOT NULL,
  `type` text NOT NULL,
  `concept` text NOT NULL,
  `week_1_amount` integer DEFAULT 0 NOT NULL,
  `week_2_amount` integer DEFAULT 0 NOT NULL,
  `week_3_amount` integer DEFAULT 0 NOT NULL,
  `week_4_amount` integer DEFAULT 0 NOT NULL,
  `total_amount` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`monthly_ledger_id`) REFERENCES `monthly_ledgers`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_monthly_ledger_lines` SELECT `id`, `monthly_ledger_id`, `type`, `concept`, CAST(ROUND(`week_1_amount` * 100) AS INTEGER), CAST(ROUND(`week_2_amount` * 100) AS INTEGER), CAST(ROUND(`week_3_amount` * 100) AS INTEGER), CAST(ROUND(`week_4_amount` * 100) AS INTEGER), CAST(ROUND(`total_amount` * 100) AS INTEGER) FROM `monthly_ledger_lines`;--> statement-breakpoint
DROP TABLE `monthly_ledger_lines`;--> statement-breakpoint
ALTER TABLE `__new_monthly_ledger_lines` RENAME TO `monthly_ledger_lines`;--> statement-breakpoint

CREATE TABLE `__new_purchase_suggestion_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `purchase_suggestion_id` text NOT NULL,
  `ingredient_id` text NOT NULL,
  `supplier_id` text,
  `current_quantity` real DEFAULT 0 NOT NULL,
  `reorder_point` real DEFAULT 0 NOT NULL,
  `suggested_quantity` real DEFAULT 0 NOT NULL,
  `suggested_packages` integer DEFAULT 0 NOT NULL,
  `estimated_cost` integer DEFAULT 0 NOT NULL,
  `reason` text,
  FOREIGN KEY (`purchase_suggestion_id`) REFERENCES `purchase_suggestions`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_purchase_suggestion_lines` SELECT `id`, `purchase_suggestion_id`, `ingredient_id`, `supplier_id`, `current_quantity`, `reorder_point`, `suggested_quantity`, `suggested_packages`, CAST(ROUND(`estimated_cost` * 100) AS INTEGER), `reason` FROM `purchase_suggestion_lines`;--> statement-breakpoint
DROP TABLE `purchase_suggestion_lines`;--> statement-breakpoint
ALTER TABLE `__new_purchase_suggestion_lines` RENAME TO `purchase_suggestion_lines`;--> statement-breakpoint

CREATE TABLE `__new_recipes` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `category` text NOT NULL,
  `servings` integer DEFAULT 1 NOT NULL,
  `production_waste_pct` real DEFAULT 0 NOT NULL,
  `target_margin_pct` real DEFAULT 0.6 NOT NULL,
  `current_sale_price` integer,
  `tax_pct` real DEFAULT 0.21 NOT NULL,
  `last_costing_at` text,
  `created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
  `updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_recipes` SELECT `id`, `name`, `category`, `servings`, `production_waste_pct`, `target_margin_pct`, CASE WHEN `current_sale_price` IS NULL THEN NULL ELSE CAST(ROUND(`current_sale_price` * 100) AS INTEGER) END, `tax_pct`, `last_costing_at`, `created_at`, `updated_at` FROM `recipes`;--> statement-breakpoint
DROP TABLE `recipes`;--> statement-breakpoint
ALTER TABLE `__new_recipes` RENAME TO `recipes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
