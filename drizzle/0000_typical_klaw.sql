CREATE TABLE `business_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` text NOT NULL,
	`business_type` text NOT NULL,
	`currency_symbol` text DEFAULT '$' NOT NULL,
	`target_margin_pct` real DEFAULT 0.6 NOT NULL,
	`max_food_cost_pct` real DEFAULT 0.3 NOT NULL,
	`tax_pct` real DEFAULT 0.21 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `excel_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`source_filename` text NOT NULL,
	`imported_at` text NOT NULL,
	`status` text NOT NULL,
	`report_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`supplier_id` text,
	`purchase_presentation_label` text,
	`purchase_quantity` real NOT NULL,
	`purchase_unit` text NOT NULL,
	`usage_unit` text NOT NULL,
	`purchase_price` real NOT NULL,
	`waste_pct` real DEFAULT 0 NOT NULL,
	`correction_factor` real DEFAULT 1 NOT NULL,
	`min_daily_consumption` real DEFAULT 0 NOT NULL,
	`max_daily_consumption` real DEFAULT 0 NOT NULL,
	`current_stock` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_count_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_count_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`current_quantity` real NOT NULL,
	`unit` text NOT NULL,
	`location` text,
	FOREIGN KEY (`inventory_count_id`) REFERENCES `inventory_counts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`counted_at` text NOT NULL,
	`counted_by` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_ledger_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`monthly_ledger_id` text NOT NULL,
	`type` text NOT NULL,
	`concept` text NOT NULL,
	`week_1_amount` real DEFAULT 0 NOT NULL,
	`week_2_amount` real DEFAULT 0 NOT NULL,
	`week_3_amount` real DEFAULT 0 NOT NULL,
	`week_4_amount` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`monthly_ledger_id`) REFERENCES `monthly_ledgers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `monthly_ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_suggestion_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_suggestion_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`supplier_id` text,
	`current_quantity` real DEFAULT 0 NOT NULL,
	`reorder_point` real DEFAULT 0 NOT NULL,
	`suggested_packages` integer DEFAULT 0 NOT NULL,
	`estimated_cost` real DEFAULT 0 NOT NULL,
	`reason` text,
	FOREIGN KEY (`purchase_suggestion_id`) REFERENCES `purchase_suggestions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`generated_at` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`ingredient_id` text,
	`sub_recipe_id` text,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_recipe_id`) REFERENCES `sub_recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`servings` integer DEFAULT 1 NOT NULL,
	`production_waste_pct` real DEFAULT 0 NOT NULL,
	`target_margin_pct` real DEFAULT 0.6 NOT NULL,
	`current_sale_price` real,
	`tax_pct` real DEFAULT 0.21 NOT NULL,
	`last_costing_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sub_recipe_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`sub_recipe_id` text NOT NULL,
	`ingredient_id` text,
	`nested_sub_recipe_id` text,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sub_recipe_id`) REFERENCES `sub_recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nested_sub_recipe_id`) REFERENCES `sub_recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sub_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`output_quantity` real NOT NULL,
	`output_unit` text NOT NULL,
	`waste_pct` real DEFAULT 0 NOT NULL,
	`correction_factor` real DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
