import { and, count, eq, isNull } from "drizzle-orm";

import {
  ingredientCategoryMap,
  ingredientSeed,
  ingredientSupplierMap,
  recipeSeed,
  subRecipeSeed,
  supplierSeed,
  ingredientSkus,
} from "../costing/benny-seed";

import { db, schema } from "./client";

function nowIso() {
  return new Date().toISOString();
}

export function seedDatabase() {
  const existingSuppliers = db.select({ value: count() }).from(schema.suppliers).get();
  if ((existingSuppliers?.value ?? 0) > 0) {
    for (const [ingredientId, sku] of Object.entries(ingredientSkus)) {
      if (sku) {
        db.update(schema.ingredients).set({ sku }).where(and(eq(schema.ingredients.id, ingredientId), isNull(schema.ingredients.sku))).run();
      }
    }
    return;
  }

  const timestamp = nowIso();

  db.insert(schema.businessSettings).values({
    businessName: "Benny Burgers",
    businessType: "Hamburguesería",
    currencySymbol: "$",
    targetMarginPct: 0.7,
    maxFoodCostPct: 0.3,
    taxPct: 0.21,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).run();

  db.insert(schema.suppliers).values(
    supplierSeed.map((supplier) => ({
      ...supplier,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  ).run();

  db.insert(schema.ingredients).values(
    Object.values(ingredientSeed).map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      sku: ingredientSkus[ingredient.id] ?? null,
      category: ingredientCategoryMap[ingredient.id] ?? "General",
      supplierId: ingredientSupplierMap[ingredient.id] ?? null,
      purchasePresentationLabel: `${ingredient.purchaseQuantity} ${ingredient.purchaseUnit}`,
      purchaseQuantity: ingredient.purchaseQuantity,
      purchaseUnit: ingredient.purchaseUnit,
      usageUnit: ingredient.usageUnit,
      purchasePrice: ingredient.purchasePrice,
      wastePct: ingredient.wastePct ?? 0,
      correctionFactor: ingredient.correctionFactor ?? 1,
      minDailyConsumption: ingredient.minDailyConsumption ?? 0,
      maxDailyConsumption: ingredient.maxDailyConsumption ?? 0,
      currentStock: ingredient.currentStock ?? 0,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  ).run();

  db.insert(schema.subRecipes).values(
    Object.values(subRecipeSeed).map((subRecipe) => ({
      id: subRecipe.id,
      name: subRecipe.name,
      outputQuantity: subRecipe.outputQuantity,
      outputUnit: subRecipe.outputUnit,
      wastePct: subRecipe.wastePct ?? 0,
      correctionFactor: subRecipe.correctionFactor ?? 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  ).run();

  db.insert(schema.subRecipeLines).values(
    Object.values(subRecipeSeed).flatMap((subRecipe) =>
      subRecipe.lines.map((line, index) => ({
        id: line.id,
        subRecipeId: subRecipe.id,
        ingredientId: line.type === "ingredient" ? line.ingredientId : null,
        nestedSubRecipeId: line.type === "subRecipe" ? line.subRecipeId : null,
        quantity: line.quantity,
        unit: line.unit,
        sortOrder: index,
      })),
    ),
  ).run();

  db.insert(schema.recipes).values(
    recipeSeed.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      category: "Hamburguesas",
      servings: recipe.servings,
      productionWastePct: recipe.productionWastePct ?? 0,
      targetMarginPct: recipe.targetMarginPct,
      currentSalePrice: recipe.currentSalePrice ?? null,
      taxPct: recipe.taxPct ?? 0.21,
      lastCostingAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  ).run();

  db.insert(schema.recipeLines).values(
    recipeSeed.flatMap((recipe) =>
      recipe.lines.map((line, index) => ({
        id: line.id,
        recipeId: recipe.id,
        ingredientId: line.type === "ingredient" ? line.ingredientId : null,
        subRecipeId: line.type === "subRecipe" ? line.subRecipeId : null,
        quantity: line.quantity,
        unit: line.unit,
        sortOrder: index,
      })),
    ),
  ).run();

  db.insert(schema.monthlyLedgers).values([
    { id: "ledger-2026-05", month: 5, year: 2026, createdAt: timestamp, updatedAt: timestamp },
  ]).run();

  db.insert(schema.monthlyLedgerLines).values([
    { id: "ledger-income-1", monthlyLedgerId: "ledger-2026-05", type: "income", concept: "Ventas mostrador", week1Amount: 1450000, week2Amount: 1520000, week3Amount: 1490000, week4Amount: 1580000, totalAmount: 6040000 },
    { id: "ledger-income-2", monthlyLedgerId: "ledger-2026-05", type: "income", concept: "Pedidos delivery", week1Amount: 420000, week2Amount: 460000, week3Amount: 440000, week4Amount: 470000, totalAmount: 1790000 },
    { id: "ledger-fixed-1", monthlyLedgerId: "ledger-2026-05", type: "fixed", concept: "Gastos fijos", week1Amount: 520000, week2Amount: 520000, week3Amount: 520000, week4Amount: 520000, totalAmount: 2080000 },
    { id: "ledger-variable-1", monthlyLedgerId: "ledger-2026-05", type: "variable", concept: "Materia prima", week1Amount: 530000, week2Amount: 555000, week3Amount: 548000, week4Amount: 572000, totalAmount: 2205000 },
  ]).run();
}
