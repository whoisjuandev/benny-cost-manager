import { IngredientsPageClient } from "@/components/screens/ingredients-page-client";
import { getIngredients, getSuppliers } from "@/lib/data/catalog";

export default function IngredientsPage() {
  const ingredients = getIngredients();
  const suppliers = getSuppliers();

  return <IngredientsPageClient ingredients={ingredients} suppliers={suppliers} />;
}
