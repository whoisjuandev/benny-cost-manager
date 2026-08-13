import { CostBadge, MarginBadge } from "@/components/domain/cost-badge";
import { PageHeader } from "@/components/domain/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/domain/format";
import { getCurrencySymbol, getRecipes } from "@/lib/data/catalog";
import { calculateFoodCostPct, calculateGrossMarginPct, calculateSuggestedPrice } from "@/lib/costing/engine";

export default function PricingAnalysisPage() {
  const recipes = getRecipes().filter((recipe) => !recipe.isSubrecipe);
  const currencySymbol = getCurrencySymbol();

  return (
    <div className="flex flex-col">
      <PageHeader title="Análisis de precios" description="Semáforo de food cost y precio de venta sugerido por receta." />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing por receta</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receta</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio actual</TableHead>
                  <TableHead className="text-right">Precio sugerido</TableHead>
                  <TableHead className="text-right">Food cost</TableHead>
                  <TableHead className="text-right">Margen bruto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => {
                  const suggested = calculateSuggestedPrice(recipe.costPerServing, 1 - recipe.targetFoodCost, recipe.ivaRate);
                  const foodCost = recipe.salePrice > 0 ? calculateFoodCostPct(recipe.costPerServing, recipe.salePrice) : 0;
                  const margin = recipe.salePrice > 0 ? calculateGrossMarginPct(recipe.costPerServing, recipe.salePrice) : 0;
                  return (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(recipe.totalCost, currencySymbol)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(recipe.salePrice, currencySymbol)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(suggested.priceWithoutTax, currencySymbol)}</TableCell>
                      <TableCell className="text-right">
                        {recipe.salePrice > 0 ? <CostBadge foodCost={foodCost} target={recipe.targetFoodCost} /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {recipe.salePrice > 0 ? <MarginBadge margin={margin} /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
