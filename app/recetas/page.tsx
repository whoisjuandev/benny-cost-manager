import { RecipesPageClient } from "@/components/screens/recipes-page-client";
import { getCurrencySymbol, getIngredients, getRecipes, getSubRecipesDetailed } from "@/lib/data/catalog";

export default function RecipesPage() {
  const recipes = getRecipes();
  const ingredients = getIngredients();
  const subRecipes = getSubRecipesDetailed();

  return <RecipesPageClient recipes={recipes} ingredients={ingredients} subRecipes={subRecipes} currencySymbol={getCurrencySymbol()} />;
}
