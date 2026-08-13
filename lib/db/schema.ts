import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { money } from "./money";

const timestamps = {
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
};

export const businessSettings = sqliteTable("business_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  currencySymbol: text("currency_symbol").notNull().default("$") ,
  targetMarginPct: real("target_margin_pct").notNull().default(0.6),
  maxFoodCostPct: real("max_food_cost_pct").notNull().default(0.3),
  taxPct: real("tax_pct").notNull().default(0.21),
  ...timestamps,
});

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  phone: text("phone"),
  leadTimeDays: integer("lead_time_days").notNull().default(2),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  ...timestamps,
});

export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category").notNull(),
  supplierId: text("supplier_id").references(() => suppliers.id),
  purchasePresentationLabel: text("purchase_presentation_label"),
  purchaseQuantity: real("purchase_quantity").notNull(),
  purchaseUnit: text("purchase_unit").notNull(),
  usageUnit: text("usage_unit").notNull(),
  purchasePrice: money("purchase_price").notNull(),
  wastePct: real("waste_pct").notNull().default(0),
  correctionFactor: real("correction_factor").notNull().default(1),
  minDailyConsumption: real("min_daily_consumption").notNull().default(0),
  maxDailyConsumption: real("max_daily_consumption").notNull().default(0),
  currentStock: real("current_stock").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const subRecipes = sqliteTable("sub_recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  outputQuantity: real("output_quantity").notNull(),
  outputUnit: text("output_unit").notNull(),
  wastePct: real("waste_pct").notNull().default(0),
  correctionFactor: real("correction_factor").notNull().default(1),
  ...timestamps,
});

export const subRecipeLines = sqliteTable("sub_recipe_lines", {
  id: text("id").primaryKey(),
  subRecipeId: text("sub_recipe_id").notNull().references(() => subRecipes.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").references(() => ingredients.id),
  nestedSubRecipeId: text("nested_sub_recipe_id").references(() => subRecipes.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  servings: integer("servings").notNull().default(1),
  productionWastePct: real("production_waste_pct").notNull().default(0),
  targetMarginPct: real("target_margin_pct").notNull().default(0.6),
  currentSalePrice: money("current_sale_price"),
  taxPct: real("tax_pct").notNull().default(0.21),
  lastCostingAt: text("last_costing_at"),
  ...timestamps,
});

export const recipeLines = sqliteTable("recipe_lines", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").references(() => ingredients.id),
  subRecipeId: text("sub_recipe_id").references(() => subRecipes.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const inventoryCounts = sqliteTable("inventory_counts", {
  id: text("id").primaryKey(),
  countedAt: text("counted_at").notNull(),
  countedBy: text("counted_by"),
  notes: text("notes"),
  ...timestamps,
});

export const inventoryCountLines = sqliteTable("inventory_count_lines", {
  id: text("id").primaryKey(),
  inventoryCountId: text("inventory_count_id").notNull().references(() => inventoryCounts.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").notNull().references(() => ingredients.id),
  currentQuantity: real("current_quantity").notNull(),
  unit: text("unit").notNull(),
  location: text("location"),
});

export const purchaseSuggestions = sqliteTable("purchase_suggestions", {
  id: text("id").primaryKey(),
  generatedAt: text("generated_at").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  ...timestamps,
});

export const purchaseSuggestionLines = sqliteTable("purchase_suggestion_lines", {
  id: text("id").primaryKey(),
  purchaseSuggestionId: text("purchase_suggestion_id").notNull().references(() => purchaseSuggestions.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").notNull().references(() => ingredients.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  currentQuantity: real("current_quantity").notNull().default(0),
  reorderPoint: real("reorder_point").notNull().default(0),
  suggestedQuantity: real("suggested_quantity").notNull().default(0),
  suggestedPackages: integer("suggested_packages").notNull().default(0),
  estimatedCost: money("estimated_cost").notNull().default(0),
  reason: text("reason"),
});

export const monthlyLedgers = sqliteTable("monthly_ledgers", {
  id: text("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  ...timestamps,
});

export const monthlyLedgerLines = sqliteTable("monthly_ledger_lines", {
  id: text("id").primaryKey(),
  monthlyLedgerId: text("monthly_ledger_id").notNull().references(() => monthlyLedgers.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  concept: text("concept").notNull(),
  week1Amount: money("week_1_amount").notNull().default(0),
  week2Amount: money("week_2_amount").notNull().default(0),
  week3Amount: money("week_3_amount").notNull().default(0),
  week4Amount: money("week_4_amount").notNull().default(0),
  totalAmount: money("total_amount").notNull().default(0),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  ingredients: many(ingredients),
}));

export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [ingredients.supplierId], references: [suppliers.id] }),
  recipeLines: many(recipeLines),
  subRecipeLines: many(subRecipeLines),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  lines: many(recipeLines),
}));

export const recipeLinesRelations = relations(recipeLines, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeLines.recipeId], references: [recipes.id] }),
  ingredient: one(ingredients, { fields: [recipeLines.ingredientId], references: [ingredients.id] }),
  subRecipe: one(subRecipes, { fields: [recipeLines.subRecipeId], references: [subRecipes.id] }),
}));

export const subRecipesRelations = relations(subRecipes, ({ many }) => ({
  lines: many(subRecipeLines),
}));

export const subRecipeLinesRelations = relations(subRecipeLines, ({ one }) => ({
  subRecipe: one(subRecipes, { fields: [subRecipeLines.subRecipeId], references: [subRecipes.id] }),
  ingredient: one(ingredients, { fields: [subRecipeLines.ingredientId], references: [ingredients.id] }),
  nestedSubRecipe: one(subRecipes, { fields: [subRecipeLines.nestedSubRecipeId], references: [subRecipes.id] }),
}));
