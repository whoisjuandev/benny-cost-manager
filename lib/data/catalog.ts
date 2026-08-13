import { eq } from "drizzle-orm";

import {
  calculateBreakEven,
  calculateFoodCostPct,
  calculateGrossMarginPct,
  calculateIngredientUnitCost,
  calculateInventoryReorderPoint,
  calculatePurchaseSuggestion,
  calculateRecipeLineCost,
  calculateRecipeCost,
  calculateSubRecipeCost,
} from "../costing/engine";
import type {
  CostingContext,
  IngredientRecord,
  RecipeDefinition,
  RecipeLine,
  SubRecipeDefinition,
} from "../costing/types";
import { ensureDatabaseReady } from "../db/init";
import { db, schema } from "../db/client";
import type { BreakEven, Ingredient, PurchaseSuggestion, Recipe, Supplier } from "../../domain/types";

function nowIso() {
  return new Date().toISOString();
}

function getCurrentLedgerId(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `ledger-${year}-${String(month).padStart(2, "0")}`;
}

function ensureLatestMonthlyLedger() {
  ensureDatabaseReady();

  const existingLedgers = db.select().from(schema.monthlyLedgers).all();
  if (existingLedgers.length > 0) {
    const sorted = [...existingLedgers].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    for (const ledger of sorted) {
      const lines = db.select()
        .from(schema.monthlyLedgerLines)
        .where(eq(schema.monthlyLedgerLines.monthlyLedgerId, ledger.id))
        .all();

      if (lines.some((line) => line.totalAmount !== 0)) {
        return { ledger, lines };
      }
    }
  }

  const date = new Date();
  const timestamp = nowIso();
  const ledgerId = getCurrentLedgerId(date);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  db.transaction((tx) => {
    tx.insert(schema.monthlyLedgers).values({
      id: ledgerId,
      month,
      year,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).onConflictDoNothing().run();

    const defaults = [
      { id: `${ledgerId}-income`, type: "income", concept: "Ventas" },
      { id: `${ledgerId}-fixed`, type: "fixed", concept: "Gastos fijos" },
      { id: `${ledgerId}-variable`, type: "variable", concept: "Costos variables" },
    ];

    for (const entry of defaults) {
      tx.insert(schema.monthlyLedgerLines).values({
        id: entry.id,
        monthlyLedgerId: ledgerId,
        type: entry.type,
        concept: entry.concept,
        week1Amount: 0,
        week2Amount: 0,
        week3Amount: 0,
        week4Amount: 0,
        totalAmount: 0,
      }).onConflictDoNothing().run();
    }
  });

  const ledger = db.select().from(schema.monthlyLedgers).where(eq(schema.monthlyLedgers.id, ledgerId)).get()!;
  const lines = db.select().from(schema.monthlyLedgerLines).where(eq(schema.monthlyLedgerLines.monthlyLedgerId, ledgerId)).all();
  return { ledger, lines };
}

function toIngredientRecord(row: typeof schema.ingredients.$inferSelect): IngredientRecord {
  return {
    id: row.id,
    name: row.name,
    purchasePrice: row.purchasePrice,
    purchaseQuantity: row.purchaseQuantity,
    purchaseUnit: row.purchaseUnit as IngredientRecord["purchaseUnit"],
    usageUnit: row.usageUnit as IngredientRecord["usageUnit"],
    wastePct: row.wastePct,
    correctionFactor: row.correctionFactor,
    minDailyConsumption: row.minDailyConsumption,
    maxDailyConsumption: row.maxDailyConsumption,
    currentStock: row.currentStock,
  };
}

function createCostingContext() {
  ensureDatabaseReady();

  const ingredientRows = db.select().from(schema.ingredients).all();
  const subRecipeRows = db.select().from(schema.subRecipes).all();
  const subRecipeLineRows = db.select().from(schema.subRecipeLines).all();

  const ingredients: Record<string, IngredientRecord> = Object.fromEntries(
    ingredientRows.map((row) => [row.id, toIngredientRecord(row)]),
  );

  const subRecipes: Record<string, SubRecipeDefinition> = Object.fromEntries(
    subRecipeRows.map((row) => {
      const lines: RecipeLine[] = subRecipeLineRows
        .filter((line) => line.subRecipeId === row.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((line) => {
          if (line.ingredientId) {
            return {
              id: line.id,
              type: "ingredient" as const,
              ingredientId: line.ingredientId,
              quantity: line.quantity,
              unit: line.unit as RecipeLine["unit"],
            };
          }

          return {
            id: line.id,
            type: "subRecipe" as const,
            subRecipeId: line.nestedSubRecipeId!,
            quantity: line.quantity,
            unit: line.unit as RecipeLine["unit"],
          };
        });

      return [
        row.id,
        {
          id: row.id,
          name: row.name,
          outputQuantity: row.outputQuantity,
          outputUnit: row.outputUnit as SubRecipeDefinition["outputUnit"],
          wastePct: row.wastePct,
          correctionFactor: row.correctionFactor,
          lines,
        } satisfies SubRecipeDefinition,
      ];
    }),
  );

  return {
    ingredients,
    subRecipes,
  } satisfies CostingContext;
}


function toTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLedgerPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function getLatestSubRecipeDependencyTimestamp(
  subRecipeId: string,
  subRecipeUpdatedAtById: Map<string, number>,
  ingredientUpdatedAtById: Map<string, number>,
  subRecipeLinesBySubRecipeId: Map<string, Array<typeof schema.subRecipeLines.$inferSelect>>,
  visiting = new Set<string>(),
): number {
  if (visiting.has(subRecipeId)) {
    return subRecipeUpdatedAtById.get(subRecipeId) ?? 0;
  }

  visiting.add(subRecipeId);

  let latest = subRecipeUpdatedAtById.get(subRecipeId) ?? 0;
  const lines = subRecipeLinesBySubRecipeId.get(subRecipeId) ?? [];

  for (const line of lines) {
    if (line.ingredientId) {
      latest = Math.max(latest, ingredientUpdatedAtById.get(line.ingredientId) ?? 0);
      continue;
    }

    if (line.nestedSubRecipeId) {
      latest = Math.max(
        latest,
        getLatestSubRecipeDependencyTimestamp(
          line.nestedSubRecipeId,
          subRecipeUpdatedAtById,
          ingredientUpdatedAtById,
          subRecipeLinesBySubRecipeId,
          visiting,
        ),
      );
    }
  }

  visiting.delete(subRecipeId);
  return latest;
}

function resolveRecipeStatus(
  recipeRow: typeof schema.recipes.$inferSelect,
  definition: RecipeDefinition,
  ingredientUpdatedAtById: Map<string, number>,
  subRecipeUpdatedAtById: Map<string, number>,
  subRecipeLinesBySubRecipeId: Map<string, Array<typeof schema.subRecipeLines.$inferSelect>>,
): Recipe["status"] {
  if (definition.lines.length === 0 || !definition.currentSalePrice || definition.currentSalePrice <= 0) {
    return "borrador";
  }

  const lastCostingAt = toTimestamp(recipeRow.lastCostingAt ?? recipeRow.updatedAt);
  if (lastCostingAt === 0) {
    return "desactualizada";
  }

  let latestDependencyUpdate = 0;
  for (const line of definition.lines) {
    if (line.type === "ingredient") {
      latestDependencyUpdate = Math.max(latestDependencyUpdate, ingredientUpdatedAtById.get(line.ingredientId) ?? 0);
      continue;
    }

    latestDependencyUpdate = Math.max(
      latestDependencyUpdate,
      getLatestSubRecipeDependencyTimestamp(
        line.subRecipeId,
        subRecipeUpdatedAtById,
        ingredientUpdatedAtById,
        subRecipeLinesBySubRecipeId,
      ),
    );
  }

  return latestDependencyUpdate > lastCostingAt ? "desactualizada" : "actualizada";
}

export function getSuppliers(): Supplier[] {
  ensureDatabaseReady();
  return db.select().from(schema.suppliers).all().map((row) => ({
    id: row.id,
    name: row.name,
    contact: row.contact ?? undefined,
    phone: row.phone ?? undefined,
    leadTimeDays: row.leadTimeDays,
    active: row.active,
    notes: row.notes ?? undefined,
  }));
}

function getStockStatus(current: number, reorderPoint: number): Ingredient["status"] {
  if (current <= reorderPoint * 0.5) return "critico";
  if (current <= reorderPoint) return "bajo";
  if (current >= reorderPoint * 1.8) return "exceso";
  return "ok";
}

export function getIngredients(): Ingredient[] {
  const context = createCostingContext();
  const rows = db.select().from(schema.ingredients).all();

  return rows.map((row) => {
    const record = context.ingredients[row.id];
    const reorderPoint = calculateInventoryReorderPoint(record.maxDailyConsumption ?? 0, 3);
    const currentStock = record.currentStock ?? 0;

    return {
      id: row.id,
      name: row.name,
      sku: row.sku ?? undefined,
      supplierId: row.supplierId ?? "",
      unit: row.usageUnit as Ingredient["unit"],
      purchaseUnit: row.purchaseUnit as Ingredient["purchaseUnit"],
      purchaseQuantity: row.purchaseQuantity,
      purchasePrice: row.purchasePrice,
      purchasePresentationLabel: row.purchasePresentationLabel ?? undefined,
      unitCost: Number(calculateIngredientUnitCost(record).toFixed(4)),
      waste: row.wastePct,
      correctionFactor: row.correctionFactor,
      stock: currentStock,
      minDaily: row.minDailyConsumption,
      maxDaily: row.maxDailyConsumption,
      reorderPoint,
      lastUpdated: row.updatedAt,
      status: getStockStatus(currentStock, reorderPoint),
      category: row.category,
    } satisfies Ingredient;
  });
}

function getRecipeDefinitions(): RecipeDefinition[] {
  ensureDatabaseReady();
  const recipeRows = db.select().from(schema.recipes).all();
  const recipeLineRows = db.select().from(schema.recipeLines).all();

  return recipeRows.map((row) => ({
    id: row.id,
    name: row.name,
    servings: row.servings,
    targetMarginPct: row.targetMarginPct,
    currentSalePrice: row.currentSalePrice ?? undefined,
    taxPct: row.taxPct,
    productionWastePct: row.productionWastePct,
    lines: recipeLineRows
      .filter((line) => line.recipeId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((line) => {
        if (line.ingredientId) {
          return {
            id: line.id,
            type: "ingredient" as const,
            ingredientId: line.ingredientId,
            quantity: line.quantity,
            unit: line.unit as RecipeLine["unit"],
          };
        }

        return {
          id: line.id,
          type: "subRecipe" as const,
          subRecipeId: line.subRecipeId!,
          quantity: line.quantity,
          unit: line.unit as RecipeLine["unit"],
        };
      }),
  }));
}

export function getRecipes(): Recipe[] {
  const context = createCostingContext();
  const recipeRows = db.select().from(schema.recipes).all();
  const ingredientRows = db.select().from(schema.ingredients).all();
  const subRecipeRows = db.select().from(schema.subRecipes).all();
  const subRecipeLineRows = db.select().from(schema.subRecipeLines).all();
  const definitions = getRecipeDefinitions();

  const ingredientUpdatedAtById = new Map(ingredientRows.map((row) => [row.id, toTimestamp(row.updatedAt)]));
  const subRecipeUpdatedAtById = new Map(subRecipeRows.map((row) => [row.id, toTimestamp(row.updatedAt)]));
  const subRecipeLinesBySubRecipeId = new Map<string, Array<typeof schema.subRecipeLines.$inferSelect>>();

  for (const line of subRecipeLineRows) {
    const existing = subRecipeLinesBySubRecipeId.get(line.subRecipeId) ?? [];
    existing.push(line);
    subRecipeLinesBySubRecipeId.set(line.subRecipeId, existing);
  }

  return definitions.map((definition) => {
    const row = recipeRows.find((candidate) => candidate.id === definition.id)!;
    const result = calculateRecipeCost(definition, context);
    const salePrice = definition.currentSalePrice ?? 0;

    return {
      id: definition.id,
      name: definition.name,
      category: row.category,
      yieldQty: definition.servings,
      yieldUnit: "porción",
      productionWastePct: row.productionWastePct,
      lines: definition.lines.map((line) => {
        if (line.type === "ingredient") {
          const ingredient = context.ingredients[line.ingredientId];
          const subtotal = calculateRecipeLineCost(line, context);
          return {
            id: line.id,
            refType: "ingredient" as const,
            refId: line.ingredientId,
            refName: ingredient.name,
            quantity: line.quantity,
            unit: line.unit as Recipe["lines"][number]["unit"],
            unitCost: Number((subtotal / line.quantity).toFixed(4)),
            subtotal,
          };
        }

        const subRecipe = context.subRecipes?.[line.subRecipeId];
        const subtotal = calculateRecipeLineCost(line, context);
        return {
          id: line.id,
          refType: "subrecipe" as const,
          refId: line.subRecipeId,
          refName: subRecipe!.name,
          quantity: line.quantity,
          unit: line.unit as Recipe["lines"][number]["unit"],
          unitCost: Number((subtotal / line.quantity).toFixed(4)),
          subtotal,
        };
      }),
      totalCost: Number(result.totalCost.toFixed(2)),
      costPerServing: Number(result.costPerServing.toFixed(2)),
      salePrice,
      ivaRate: definition.taxPct ?? 0.21,
      targetFoodCost: Number((1 - definition.targetMarginPct).toFixed(2)),
      status: resolveRecipeStatus(
        row,
        definition,
        ingredientUpdatedAtById,
        subRecipeUpdatedAtById,
        subRecipeLinesBySubRecipeId,
      ),
      lastCostedAt: row.lastCostingAt ?? row.updatedAt,
    } satisfies Recipe;
  });
}

export function getDashboardData() {
  const ingredients = getIngredients();
  const recipes = getRecipes();
  const pricedRecipes = recipes.filter((recipe) => recipe.salePrice > 0);
  const { ledger: currentLedger, lines: monthly } = ensureLatestMonthlyLedger();
  const sortedLedgers = db.select().from(schema.monthlyLedgers).all().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  const previousLedger = sortedLedgers.find((ledger) => ledger.id !== currentLedger.id);
  const previousLines = previousLedger
    ? db.select().from(schema.monthlyLedgerLines).where(eq(schema.monthlyLedgerLines.monthlyLedgerId, previousLedger.id)).all()
    : [];

  const income = monthly.filter((line) => line.type === "income").reduce((total, line) => total + line.totalAmount, 0);
  const previousIncome = previousLines.filter((line) => line.type === "income").reduce((total, line) => total + line.totalAmount, 0);
  const avgFoodCost = pricedRecipes.length > 0
      ? pricedRecipes.reduce((total, recipe) => total + calculateFoodCostPct(recipe.costPerServing, recipe.salePrice), 0) / pricedRecipes.length
    : 0;
  const grossMargin = pricedRecipes.length > 0
      ? pricedRecipes.reduce((total, recipe) => total + calculateGrossMarginPct(recipe.costPerServing, recipe.salePrice), 0) / pricedRecipes.length
    : 0;
  const avgTicket = pricedRecipes.length > 0
    ? pricedRecipes.reduce((total, recipe) => total + recipe.salePrice, 0) / pricedRecipes.length
    : 0;
  const ordersThisMonth = income > 0 && avgTicket > 0 ? Math.round(income / avgTicket) : 0;
  const previousOrders = previousIncome > 0 && avgTicket > 0 ? Math.round(previousIncome / avgTicket) : 0;

  return {
    dashboardKpis: {
      periodLabel: formatLedgerPeriod(currentLedger.month, currentLedger.year),
      monthRevenue: income,
      monthRevenueDelta: previousIncome > 0 ? (income - previousIncome) / previousIncome : 0,
      avgFoodCost,
      avgFoodCostDelta: 0,
      grossMargin,
      grossMarginDelta: 0,
      avgTicket,
      ordersThisMonth,
      ordersDelta: previousOrders > 0 ? (ordersThisMonth - previousOrders) / previousOrders : 0,
      outdatedRecipes: recipes.filter((recipe) => recipe.status === "desactualizada").length,
      ingredientsToReorder: ingredients.filter((ingredient) => ingredient.status === "critico" || ingredient.status === "bajo").length,
    },
    ingredients,
    recipes,
  };
}

export function getPurchaseSuggestions(): PurchaseSuggestion[] {
  const context = createCostingContext();
  const ingredients = getIngredients();
  const suppliers = getSuppliers();

  return ingredients
    .map((ingredient) => {
      const source = context.ingredients[ingredient.id];
      const supplier = suppliers.find((candidate) => candidate.id === ingredient.supplierId);
      const coverageDays = Math.max(supplier?.leadTimeDays ?? 0, 3);
      const suggestion = calculatePurchaseSuggestion({
        ingredient: source,
        currentStock: source.currentStock ?? 0,
        coverageDays,
      });

      return {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        supplierName: supplier?.name ?? "—",
        supplierActive: supplier?.active ?? false,
        currentStock: source.currentStock ?? 0,
        reorderPoint: suggestion.reorderPoint,
        coverageDays,
        suggestedQty: suggestion.requiredQuantity,
        unit: source.usageUnit as PurchaseSuggestion["unit"],
        purchasePresentationLabel: ingredient.purchasePresentationLabel,
        unitCost: Number(calculateIngredientUnitCost(source).toFixed(4)),
        estimatedCost: suggestion.estimatedCost,
        suggestedPackages: suggestion.suggestedPackages,
        reason: !supplier
          ? "Sin proveedor asignado."
          : !supplier.active
            ? "Proveedor inactivo: revisar antes de comprar."
            : `Cobertura calculada para ${coverageDays} días.`,
      } satisfies PurchaseSuggestion;
    })
    .filter((suggestion) => suggestion.suggestedQty > 0);
}

export function getLatestPurchaseSuggestionSnapshot() {
  ensureDatabaseReady();

  const latest = db.select().from(schema.purchaseSuggestions).all().sort((a, b) => {
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  })[0];

  if (!latest) {
    return null;
  }

  const ingredients = getIngredients();
  const suppliers = getSuppliers();
  const lines = db.select()
    .from(schema.purchaseSuggestionLines)
    .where(eq(schema.purchaseSuggestionLines.purchaseSuggestionId, latest.id))
    .all();

  return {
    id: latest.id,
    generatedAt: latest.generatedAt,
    status: latest.status,
    notes: latest.notes,
    lines: lines.map((line) => {
      const supplier = suppliers.find((candidate) => candidate.id === line.supplierId);
      const ingredient = ingredients.find((candidate) => candidate.id === line.ingredientId);

      return {
        id: line.id,
        ingredientId: line.ingredientId,
        ingredientName: ingredient?.name ?? line.ingredientId,
        supplierName: supplier?.name ?? "—",
        supplierActive: supplier?.active ?? false,
        currentQuantity: line.currentQuantity,
        reorderPoint: line.reorderPoint,
        coverageDays: Math.max(supplier?.leadTimeDays ?? 0, 3),
        suggestedQuantity: line.suggestedQuantity,
        suggestedPackages: line.suggestedPackages,
        estimatedCost: line.estimatedCost,
        reason: line.reason,
        unit: ingredient?.unit ?? "u",
        purchasePresentationLabel: ingredient?.purchasePresentationLabel,
      };
    }),
  };
}

export function getBreakEvenSummary(): BreakEven {
  const { lines } = ensureLatestMonthlyLedger();
  const recipes = getRecipes().filter((recipe) => !recipe.isSubrecipe && recipe.salePrice > 0);
  const fixedCosts = lines
    .filter((line) => line.type === "fixed")
    .reduce((total, line) => total + line.totalAmount, 0);
  const monthlyRevenue = lines
    .filter((line) => line.type === "income")
    .reduce((total, line) => total + line.totalAmount, 0);
  const avgTicket = recipes.length > 0
    ? recipes.reduce((total, recipe) => total + recipe.salePrice, 0) / recipes.length
    : 0;
  const avgFoodCostPct = recipes.length > 0
    ? recipes.reduce((total, recipe) => total + (recipe.costPerServing / recipe.salePrice), 0) / recipes.length
    : 0.3;
  const safeMonthlyRevenue = monthlyRevenue > 0 ? monthlyRevenue : 1;
  const safeAvgTicket = avgTicket > 0 ? avgTicket : 1;
  const monthlySalesCount = Math.max(Math.round(safeMonthlyRevenue / safeAvgTicket), 1);
  const monthlyVariableCosts = lines
    .filter((line) => line.type === "variable")
    .reduce((total, line) => total + line.totalAmount, 0);
  const variableCostPerSale = monthlyVariableCosts / monthlySalesCount;

  let result;
  try {
    result = calculateBreakEven({
      fixedCosts,
      monthlyRevenue: safeMonthlyRevenue,
      monthlySalesCount,
      avgFoodCostPct,
      variableCostPerSale,
      sellingDays: 30,
    });
  } catch {
    const fallbackContributionPct = Math.max(1 - avgFoodCostPct, 0.01);
    const fallbackContributionAmount = Math.max(
      safeAvgTicket * fallbackContributionPct - variableCostPerSale,
      0.01,
    );
    const breakEvenUnitsMonth = Math.max(Math.ceil((fixedCosts || 1) / fallbackContributionAmount), 1);

    result = {
      avgTicket: safeAvgTicket,
      contributionMarginAmount: fallbackContributionAmount,
      contributionMarginPct: fallbackContributionAmount / safeAvgTicket,
      breakEvenUnitsMonth,
      breakEvenRevenueMonth: breakEvenUnitsMonth * safeAvgTicket,
      breakEvenUnitsDay: Math.max(Math.ceil(breakEvenUnitsMonth / 30), 1),
      breakEvenRevenueDay: Math.max(Math.ceil(breakEvenUnitsMonth / 30), 1) * safeAvgTicket,
    };
  }

  return {
    fixedCosts,
    avgContributionMargin: result.contributionMarginPct,
    avgTicket: result.avgTicket,
    breakEvenRevenue: result.breakEvenRevenueMonth,
    breakEvenUnits: result.breakEvenUnitsMonth,
  };
}

export function refreshDemoData() {
  ensureDatabaseReady();
  return {
    suppliers: getSuppliers(),
    ingredients: getIngredients(),
    recipes: getRecipes(),
  };
}

export function getMonthlyLedgerOverview() {
  const { ledger, lines } = ensureLatestMonthlyLedger();
  return {
    ledger,
    lines,
    ledgers: db.select().from(schema.monthlyLedgers).all().sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    }),
  };
}

export function getMonthlyLedgerOverviewById(ledgerId?: string) {
  ensureDatabaseReady();

  const ledgers = db.select().from(schema.monthlyLedgers).all().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const fallback = ensureLatestMonthlyLedger().ledger;
  const ledger = ledgers.find((item) => item.id === ledgerId) ?? fallback;
  const lines = db.select()
    .from(schema.monthlyLedgerLines)
    .where(eq(schema.monthlyLedgerLines.monthlyLedgerId, ledger.id))
    .all();

  return {
    ledger,
    lines,
    ledgers,
  };
}

export function getBusinessSettings() {
  ensureDatabaseReady();
  const row = db.select().from(schema.businessSettings).get();
  return row;
}

export function getCurrencySymbol() {
  return getBusinessSettings()?.currencySymbol ?? "$";
}

export function getSubRecipesView() {
  const context = createCostingContext();
  return Object.values(context.subRecipes ?? {}).map((subRecipe) => {
    const cost = calculateSubRecipeCost(subRecipe, context);
    return {
      id: subRecipe.id,
      name: subRecipe.name,
      outputQuantity: subRecipe.outputQuantity,
      outputUnit: subRecipe.outputUnit,
      totalCost: cost.totalCost,
      costPerOutputUnit: cost.costPerOutputUnit,
      lines: subRecipe.lines.length,
    };
  });
}

export function getSubRecipesDetailed() {
  const context = createCostingContext();
  const rows = db.select().from(schema.subRecipes).all();

  return rows.map((row) => {
    const subRecipe = context.subRecipes?.[row.id];
    const cost = calculateSubRecipeCost(subRecipe!, context);

    return {
      id: row.id,
      name: row.name,
      outputQuantity: row.outputQuantity,
      outputUnit: row.outputUnit,
      wastePct: row.wastePct,
      correctionFactor: row.correctionFactor,
      lastUpdated: row.updatedAt,
      totalCost: Number(cost.totalCost.toFixed(2)),
      costPerOutputUnit: Number(cost.costPerOutputUnit.toFixed(4)),
      lines: subRecipe!.lines.map((line) => {
        if (line.type === "ingredient") {
          const ingredient = context.ingredients[line.ingredientId];
          const subtotal = calculateRecipeLineCost(line, context);

          return {
            id: line.id,
            refType: "ingredient" as const,
            refId: line.ingredientId,
            refName: ingredient.name,
            quantity: line.quantity,
            unit: line.unit,
            unitCost: Number((subtotal / line.quantity).toFixed(4)),
            subtotal,
          };
        }

        const nestedSubRecipe = context.subRecipes?.[line.subRecipeId];
        const subtotal = calculateRecipeLineCost(line, context);

        return {
          id: line.id,
          refType: "subrecipe" as const,
          refId: line.subRecipeId,
          refName: nestedSubRecipe!.name,
          quantity: line.quantity,
          unit: line.unit,
          unitCost: Number((subtotal / line.quantity).toFixed(4)),
          subtotal,
        };
      }),
    };
  });
}
