// Domain types — presentational/data contract for future CostingEngine.
// Keep this file free of UI logic.

export type ID = string;

export type UnitOfMeasure =
  | "g" | "kg" | "ml" | "l" | "u" | "docena" | "porción";

export type RecipeStatus = "actualizada" | "desactualizada" | "borrador";

export type StockStatus = "ok" | "bajo" | "critico" | "exceso";

export type PriceHealth = "saludable" | "ajustado" | "perdida";

export interface Supplier {
  id: ID;
  name: string;
  contact?: string;
  phone?: string;
  leadTimeDays: number;
  active: boolean;
  notes?: string;
}

export interface Ingredient {
  id: ID;
  name: string;
  sku?: string;
  supplierId: ID;
  unit: UnitOfMeasure;
  purchaseUnit: UnitOfMeasure;
  purchaseQuantity: number;
  purchasePrice: number;
  purchasePresentationLabel?: string;
  /** precio por unidad base (sin IVA) */
  unitCost: number;
  /** % merma (0-1) */
  waste: number;
  /** factor de corrección sobre rendimiento (default 1) */
  correctionFactor: number;
  stock: number;
  minDaily: number;
  maxDaily: number;
  reorderPoint: number;
  lastUpdated: string; // ISO
  status: StockStatus;
  category: string;
}

export interface RecipeLine {
  id: ID;
  refType: "ingredient" | "subrecipe";
  refId: ID;
  refName: string;
  quantity: number;
  unit: UnitOfMeasure;
  /** costo unitario congelado al momento del costeo */
  unitCost: number;
  /** subtotal convertido a la unidad cargada en la línea */
  subtotal: number;
}

export interface Recipe {
  id: ID;
  name: string;
  category: string;
  yieldQty: number;
  yieldUnit: UnitOfMeasure;
  productionWastePct?: number;
  lines: RecipeLine[];
  /** costo total (sumatoria con merma/corrección) */
  totalCost: number;
  /** costo de una porción, usado cuando el precio es por porción */
  costPerServing: number;
  /** precio de venta sin IVA */
  salePrice: number;
  ivaRate: number; // 0.21
  targetFoodCost: number; // 0.30
  status: RecipeStatus;
  lastCostedAt: string;
  isSubrecipe?: boolean;
}

export interface MonthlyFlow {
  month: string; // "2026-05"
  income: number;
  fixedCosts: number;
  variableCosts: number;
}

export interface BreakEven {
  fixedCosts: number;
  avgContributionMargin: number; // 0-1
  avgTicket: number;
  breakEvenRevenue: number;
  breakEvenUnits: number;
}

export interface PurchaseSuggestion {
  ingredientId: ID;
  ingredientName: string;
  supplierName: string;
  supplierActive?: boolean;
  currentStock: number;
  reorderPoint?: number;
  coverageDays?: number;
  suggestedQty: number;
  unit: UnitOfMeasure;
  purchasePresentationLabel?: string;
  unitCost: number;
  estimatedCost: number;
  suggestedPackages?: number;
  reason?: string;
}
