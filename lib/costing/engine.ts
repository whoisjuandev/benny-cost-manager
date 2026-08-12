import {
  type BreakEvenInput,
  type BreakEvenResult,
  type CalculatedRecipeCost,
  type CalculatedSubRecipeCost,
  type CostingContext,
  type IngredientCostInput,
  type PurchaseSuggestionInput,
  type PurchaseSuggestionResult,
  type RecipeDefinition,
  type RecipeLine,
  type SubRecipeDefinition,
  type SuggestedPrice,
} from "./types";
import { convertUnit } from "./units";

function assertPercentage(value: number, label: string) {
  if (value < 0) {
    throw new Error(`${label} cannot be negative`);
  }
}

function getEffectiveMultiplier(wastePct = 0, correctionFactor = 1): number {
  assertPercentage(wastePct, "wastePct");

  if (correctionFactor <= 0) {
    throw new Error("correctionFactor must be greater than 0");
  }

  return (1 + wastePct) * correctionFactor;
}

export function calculateIngredientUnitCost(ingredient: IngredientCostInput): number {
  if (ingredient.purchaseQuantity <= 0) {
    throw new Error("purchaseQuantity must be greater than 0");
  }

  if (ingredient.purchasePrice < 0) {
    throw new Error("purchasePrice cannot be negative");
  }

  const quantityInUsageUnit = convertUnit(
    ingredient.purchaseQuantity,
    ingredient.purchaseUnit,
    ingredient.usageUnit,
  );

  const baseUnitCost = ingredient.purchasePrice / quantityInUsageUnit;
  return baseUnitCost * getEffectiveMultiplier(ingredient.wastePct, ingredient.correctionFactor);
}

function calculateIngredientLineCost(line: Extract<RecipeLine, { type: "ingredient" }>, context: CostingContext) {
  const ingredient = context.ingredients[line.ingredientId];
  if (!ingredient) {
    throw new Error(`Ingredient not found: ${line.ingredientId}`);
  }

  const quantityInUsageUnit = convertUnit(line.quantity, line.unit, ingredient.usageUnit);
  return quantityInUsageUnit * calculateIngredientUnitCost(ingredient);
}

export function calculateSubRecipeCost(
  subRecipe: SubRecipeDefinition,
  context: CostingContext,
): CalculatedSubRecipeCost {
  if (subRecipe.outputQuantity <= 0) {
    throw new Error("subRecipe.outputQuantity must be greater than 0");
  }

  const totalLineCost = subRecipe.lines.reduce((total, line) => {
    if (line.type === "ingredient") {
      return total + calculateIngredientLineCost(line, context);
    }

    const nested = context.subRecipes?.[line.subRecipeId];
    if (!nested) {
      throw new Error(`Sub-recipe not found: ${line.subRecipeId}`);
    }

    const nestedCost = calculateSubRecipeCost(nested, context);
    const quantityInOutputUnit = convertUnit(line.quantity, line.unit, nestedCost.outputUnit);
    return total + quantityInOutputUnit * nestedCost.costPerOutputUnit;
  }, 0);

  const adjustedTotalCost = totalLineCost * getEffectiveMultiplier(subRecipe.wastePct, subRecipe.correctionFactor);

  return {
    totalCost: adjustedTotalCost,
    outputQuantity: subRecipe.outputQuantity,
    outputUnit: subRecipe.outputUnit,
    costPerOutputUnit: adjustedTotalCost / subRecipe.outputQuantity,
  };
}

export function calculateRecipeLineCost(line: RecipeLine, context: CostingContext): number {
  if (line.type === "ingredient") {
    return calculateIngredientLineCost(line, context);
  }

  const subRecipe = context.subRecipes?.[line.subRecipeId];
  if (!subRecipe) {
    throw new Error(`Sub-recipe not found: ${line.subRecipeId}`);
  }

  const subRecipeCost = calculateSubRecipeCost(subRecipe, context);
  const quantityInOutputUnit = convertUnit(line.quantity, line.unit, subRecipeCost.outputUnit);
  return quantityInOutputUnit * subRecipeCost.costPerOutputUnit;
}

export function calculateRecipeCost(
  recipe: RecipeDefinition,
  context: CostingContext,
): CalculatedRecipeCost {
  if (recipe.servings <= 0) {
    throw new Error("recipe.servings must be greater than 0");
  }

  const totalLineCost = recipe.lines.reduce((total, line) => total + calculateRecipeLineCost(line, context), 0);
  const adjustedTotalCost = totalLineCost * getEffectiveMultiplier(recipe.productionWastePct, 1);

  return {
    totalCost: adjustedTotalCost,
    costPerServing: adjustedTotalCost / recipe.servings,
    servings: recipe.servings,
  };
}

export function calculateSuggestedPrice(
  cost: number,
  targetMarginPct: number,
  taxPct: number,
): SuggestedPrice {
  if (targetMarginPct >= 1) {
    throw new Error("targetMarginPct must be lower than 1");
  }

  if (taxPct < 0) {
    throw new Error("taxPct cannot be negative");
  }

  const priceWithoutTax = cost / (1 - targetMarginPct);
  return {
    priceWithoutTax,
    priceWithTax: priceWithoutTax * (1 + taxPct),
  };
}

export function calculateFoodCostPct(cost: number, priceWithoutTax: number): number {
  if (priceWithoutTax <= 0) {
    throw new Error("priceWithoutTax must be greater than 0");
  }

  return cost / priceWithoutTax;
}

export function calculateGrossMarginPct(cost: number, priceWithoutTax: number): number {
  if (priceWithoutTax <= 0) {
    throw new Error("priceWithoutTax must be greater than 0");
  }

  return (priceWithoutTax - cost) / priceWithoutTax;
}

export function calculateInventoryReorderPoint(maxDailyConsumption: number, coverageDays = 3): number {
  if (maxDailyConsumption < 0) {
    throw new Error("maxDailyConsumption cannot be negative");
  }

  if (coverageDays <= 0) {
    throw new Error("coverageDays must be greater than 0");
  }

  return maxDailyConsumption * coverageDays;
}

export function calculatePurchaseSuggestion({
  ingredient,
  currentStock,
  coverageDays = 3,
}: PurchaseSuggestionInput): PurchaseSuggestionResult {
  const reorderPoint = calculateInventoryReorderPoint(
    ingredient.maxDailyConsumption ?? 0,
    coverageDays,
  );
  const requiredQuantity = Math.max(reorderPoint - currentStock, 0);
  const packageQuantityInUsageUnit = convertUnit(
    ingredient.purchaseQuantity,
    ingredient.purchaseUnit,
    ingredient.usageUnit,
  );
  const suggestedPackages = requiredQuantity > 0
    ? Math.max(Math.ceil(requiredQuantity / packageQuantityInUsageUnit), 1)
    : 0;

  return {
    reorderPoint,
    requiredQuantity,
    suggestedPackages,
    estimatedCost: suggestedPackages * ingredient.purchasePrice,
    shouldReorder: currentStock <= reorderPoint,
  };
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  if (input.monthlySalesCount <= 0) {
    throw new Error("monthlySalesCount must be greater than 0");
  }

  if (input.sellingDays <= 0) {
    throw new Error("sellingDays must be greater than 0");
  }

  const avgTicket = input.monthlyRevenue / input.monthlySalesCount;
  const contributionMarginAmount = avgTicket * (1 - input.avgFoodCostPct) - input.variableCostPerSale;

  if (contributionMarginAmount <= 0) {
    throw new Error("contributionMarginAmount must be greater than 0");
  }

  const breakEvenUnitsMonth = Math.ceil(input.fixedCosts / contributionMarginAmount);
  const breakEvenRevenueMonth = avgTicket * breakEvenUnitsMonth;
  const breakEvenUnitsDay = Math.ceil(breakEvenUnitsMonth / input.sellingDays);
  const breakEvenRevenueDay = avgTicket * breakEvenUnitsDay;

  return {
    avgTicket,
    contributionMarginAmount,
    contributionMarginPct: contributionMarginAmount / avgTicket,
    breakEvenUnitsMonth,
    breakEvenRevenueMonth,
    breakEvenUnitsDay,
    breakEvenRevenueDay,
  };
}
