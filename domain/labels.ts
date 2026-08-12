// Presentational helpers — small pure mappings from domain values to UI cues.
// No financial calculations live here; only labels and variant mapping.
import type { PriceHealth, RecipeStatus, StockStatus } from "./types";

export const stockStatusLabel: Record<StockStatus, string> = {
  ok: "En stock",
  bajo: "Stock bajo",
  critico: "Crítico",
  exceso: "Sobre stock",
};

export const recipeStatusLabel: Record<RecipeStatus, string> = {
  actualizada: "Actualizada",
  desactualizada: "Desactualizada",
  borrador: "Borrador",
};

export const priceHealthLabel: Record<PriceHealth, string> = {
  saludable: "Saludable",
  ajustado: "Ajustado",
  perdida: "En pérdida",
};

/** Map a food-cost ratio to a presentational signal vs a target. */
export function priceHealthFromFoodCost(
  foodCost: number,
  target: number,
): PriceHealth {
  if (foodCost <= target) return "saludable";
  if (foodCost <= target + 0.05) return "ajustado";
  return "perdida";
}
