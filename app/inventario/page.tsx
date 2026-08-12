import { InventoryPageClient } from "@/components/screens/inventory-page-client";
import { getIngredients } from "@/lib/data/catalog";

export default function InventoryPage() {
  const ingredients = getIngredients();

  return <InventoryPageClient ingredients={ingredients} />;
}

