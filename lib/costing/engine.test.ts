import { describe, expect, it } from "vitest";

import {
  calculateBreakEven,
  calculateFoodCostPct,
  calculateGrossMarginPct,
  calculateIngredientUnitCost,
  calculateInventoryReorderPoint,
  calculatePurchaseSuggestion,
  calculateRecipeCost,
  calculateSuggestedPrice,
  calculateSubRecipeCost,
} from "./engine";
import type { CostingContext, IngredientRecord, RecipeDefinition, SubRecipeDefinition } from "./types";
import { convertUnit } from "./units";

const ingredients: Record<string, IngredientRecord> = {
  flour: {
    id: "flour",
    name: "Harina 000",
    purchasePrice: 2800,
    purchaseQuantity: 25,
    purchaseUnit: "kg",
    usageUnit: "g",
    wastePct: 0,
    correctionFactor: 1,
    maxDailyConsumption: 2,
  },
  cheddar: {
    id: "cheddar",
    name: "Cheddar",
    purchasePrice: 9200,
    purchaseQuantity: 1,
    purchaseUnit: "kg",
    usageUnit: "g",
    wastePct: 0.03,
    correctionFactor: 1,
    maxDailyConsumption: 3.5,
  },
  bun: {
    id: "bun",
    name: "Pan brioche",
    purchasePrice: 4560,
    purchaseQuantity: 12,
    purchaseUnit: "docena",
    usageUnit: "u",
    wastePct: 0,
    correctionFactor: 1,
    maxDailyConsumption: 180,
  },
  sauce: {
    id: "sauce",
    name: "Salsa base",
    purchasePrice: 3000,
    purchaseQuantity: 1,
    purchaseUnit: "l",
    usageUnit: "ml",
    wastePct: 0.1,
    correctionFactor: 1,
    maxDailyConsumption: 250,
  },
};

const subRecipes: Record<string, SubRecipeDefinition> = {
  bennySauce: {
    id: "bennySauce",
    name: "Salsa Benny",
    outputQuantity: 1000,
    outputUnit: "g",
    lines: [
      { id: "s1", type: "ingredient", ingredientId: "sauce", quantity: 300, unit: "ml" },
      { id: "s2", type: "ingredient", ingredientId: "cheddar", quantity: 50, unit: "g" },
    ],
  },
};

const context: CostingContext = { ingredients, subRecipes };

describe("convertUnit", () => {
  it("converts kg to g", () => {
    expect(convertUnit(2, "kg", "g")).toBe(2000);
  });

  it("converts l to ml", () => {
    expect(convertUnit(1.5, "l", "ml")).toBe(1500);
  });

  it("converts docena to unidad", () => {
    expect(convertUnit(2, "docena", "u")).toBe(24);
  });
});

describe("calculateIngredientUnitCost", () => {
  it("calculates unit cost with explicit conversion", () => {
    expect(calculateIngredientUnitCost(ingredients.flour)).toBeCloseTo(0.112, 3);
  });

  it("applies waste factor to unit cost", () => {
    expect(calculateIngredientUnitCost(ingredients.cheddar)).toBeCloseTo(9.476, 3);
  });
});

describe("calculateSubRecipeCost", () => {
  it("calculates cost per output unit", () => {
    const result = calculateSubRecipeCost(subRecipes.bennySauce, context);
    expect(result.totalCost).toBeCloseTo(1463.8, 1);
    expect(result.costPerOutputUnit).toBeCloseTo(1.4638, 4);
  });
});

describe("calculateRecipeCost", () => {
  it("calculates total and per-serving cost using ingredients and sub-recipes", () => {
    const recipe: RecipeDefinition = {
      id: "classic",
      name: "Benny Classic",
      servings: 1,
      targetMarginPct: 0.6,
      taxPct: 0.21,
      productionWastePct: 0.05,
      lines: [
        { id: "r1", type: "ingredient", ingredientId: "bun", quantity: 1, unit: "u" },
        { id: "r2", type: "ingredient", ingredientId: "cheddar", quantity: 40, unit: "g" },
        { id: "r3", type: "subRecipe", subRecipeId: "bennySauce", quantity: 30, unit: "g" },
      ],
    };

    const result = calculateRecipeCost(recipe, context);
    expect(result.totalCost).toBeCloseTo(477.35, 2);
    expect(result.costPerServing).toBeCloseTo(477.35, 2);
  });
});

describe("pricing helpers", () => {
  it("calculates suggested price with tax", () => {
    const result = calculateSuggestedPrice(2000, 0.6, 0.21);
    expect(result.priceWithoutTax).toBeCloseTo(5000, 2);
    expect(result.priceWithTax).toBeCloseTo(6050, 2);
  });

  it("calculates food cost and gross margin", () => {
    expect(calculateFoodCostPct(2000, 5000)).toBeCloseTo(0.4, 5);
    expect(calculateGrossMarginPct(2000, 5000)).toBeCloseTo(0.6, 5);
  });
});

describe("inventory helpers", () => {
  it("calculates reorder point", () => {
    expect(calculateInventoryReorderPoint(18)).toBe(54);
  });

  it("calculates purchase suggestion based on package size", () => {
    const result = calculatePurchaseSuggestion({
      ingredient: ingredients.flour,
      currentStock: 1,
      coverageDays: 3,
    });

    expect(result.reorderPoint).toBe(6);
    expect(result.requiredQuantity).toBe(5);
    expect(result.suggestedPackages).toBe(1);
    expect(result.estimatedCost).toBe(2800);
    expect(result.shouldReorder).toBe(true);
  });
});

describe("calculateBreakEven", () => {
  it("calculates break-even units and revenue", () => {
    const result = calculateBreakEven({
      fixedCosts: 1_900_000,
      monthlyRevenue: 5_750_000,
      monthlySalesCount: 587,
      avgFoodCostPct: 0.31,
      variableCostPerSale: 1200,
      sellingDays: 30,
    });

    expect(result.avgTicket).toBeCloseTo(9795.57, 2);
    expect(result.contributionMarginAmount).toBeCloseTo(5558.94, 2);
    expect(result.breakEvenUnitsMonth).toBe(342);
    expect(result.breakEvenUnitsDay).toBe(12);
  });
});
