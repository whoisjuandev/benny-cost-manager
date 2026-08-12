export type Unit = "g" | "kg" | "ml" | "l" | "u" | "docena" | "porción";

export type UnitFamily = "mass" | "volume" | "count" | "serving";

export interface BusinessSettings {
  currencySymbol: string;
  targetMarginPct: number;
  maxFoodCostPct: number;
  taxPct: number;
}

export interface IngredientCostInput {
  id: string;
  name: string;
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: Unit;
  usageUnit: Unit;
  wastePct?: number;
  correctionFactor?: number;
}

export interface IngredientRecord extends IngredientCostInput {
  minDailyConsumption?: number;
  maxDailyConsumption?: number;
  currentStock?: number;
}

export interface RecipeIngredientLine {
  id: string;
  type: "ingredient";
  ingredientId: string;
  quantity: number;
  unit: Unit;
}

export interface RecipeSubRecipeLine {
  id: string;
  type: "subRecipe";
  subRecipeId: string;
  quantity: number;
  unit: Unit;
}

export type RecipeLine = RecipeIngredientLine | RecipeSubRecipeLine;

export interface SubRecipeDefinition {
  id: string;
  name: string;
  outputQuantity: number;
  outputUnit: Unit;
  wastePct?: number;
  correctionFactor?: number;
  lines: RecipeLine[];
}

export interface RecipeDefinition {
  id: string;
  name: string;
  servings: number;
  targetMarginPct: number;
  currentSalePrice?: number;
  taxPct?: number;
  productionWastePct?: number;
  lines: RecipeLine[];
}

export interface CostingContext {
  ingredients: Record<string, IngredientRecord>;
  subRecipes?: Record<string, SubRecipeDefinition>;
}

export interface CalculatedSubRecipeCost {
  totalCost: number;
  outputQuantity: number;
  outputUnit: Unit;
  costPerOutputUnit: number;
}

export interface CalculatedRecipeCost {
  totalCost: number;
  costPerServing: number;
  servings: number;
}

export interface SuggestedPrice {
  priceWithoutTax: number;
  priceWithTax: number;
}

export interface PurchaseSuggestionInput {
  ingredient: IngredientRecord;
  currentStock: number;
  coverageDays?: number;
}

export interface PurchaseSuggestionResult {
  reorderPoint: number;
  requiredQuantity: number;
  suggestedPackages: number;
  estimatedCost: number;
  shouldReorder: boolean;
}

export interface BreakEvenInput {
  fixedCosts: number;
  monthlyRevenue: number;
  monthlySalesCount: number;
  avgFoodCostPct: number;
  variableCostPerSale: number;
  sellingDays: number;
}

export interface BreakEvenResult {
  avgTicket: number;
  contributionMarginAmount: number;
  contributionMarginPct: number;
  breakEvenUnitsMonth: number;
  breakEvenRevenueMonth: number;
  breakEvenUnitsDay: number;
  breakEvenRevenueDay: number;
}
