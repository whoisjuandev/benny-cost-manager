import { SubRecipesPageClient } from "@/components/screens/sub-recipes-page-client";
import { getIngredients, getSubRecipesDetailed } from "@/lib/data/catalog";

export default function SubRecipesPage() {
  const subRecipes = getSubRecipesDetailed();
  const ingredients = getIngredients();

  return <SubRecipesPageClient subRecipes={subRecipes} ingredients={ingredients} />;
}

