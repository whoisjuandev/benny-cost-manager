import Link from "next/link";
import {
  AlertTriangle,
  ChefHat,
  DollarSign,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/domain/page-header";
import { KpiCard } from "@/components/domain/kpi-card";
import { RecipeStatusBadge } from "@/components/domain/recipe-status-badge";
import { StockBadge } from "@/components/domain/stock-badge";
import { CostBadge } from "@/components/domain/cost-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatPercent } from "@/domain/format";
import { getDashboardData } from "@/lib/data/catalog";

export default function DashboardPage() {
  const { dashboardKpis, ingredients, recipes } = getDashboardData();
  const outdated = recipes.filter((r) => r.status === "desactualizada");
  const lowStock = ingredients.filter((i) => i.status === "critico" || i.status === "bajo").slice(0, 5);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dashboard"
        description={`Resumen ejecutivo · ${dashboardKpis.periodLabel}`}
        actions={
          <>
            <Button variant="outline" size="sm">Exportar</Button>
            <Button size="sm">Cerrar mes</Button>
          </>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Ingresos del mes" value={formatCurrency(dashboardKpis.monthRevenue)} delta={dashboardKpis.monthRevenueDelta} hint="vs mes anterior" icon={<DollarSign className="h-4 w-4" />} />
          <KpiCard label="Food cost promedio" value={formatPercent(dashboardKpis.avgFoodCost)} delta={dashboardKpis.avgFoodCostDelta} invertDelta hint="objetivo 30%" icon={<Percent className="h-4 w-4" />} />
          <KpiCard label="Margen bruto" value={formatPercent(dashboardKpis.grossMargin)} delta={dashboardKpis.grossMarginDelta} hint="vs mes anterior" icon={<TrendingUp className="h-4 w-4" />} />
          <KpiCard label="Pedidos del mes" value={dashboardKpis.ordersThisMonth.toLocaleString("es-AR")} delta={dashboardKpis.ordersDelta} hint={`ticket promedio ${formatCurrency(dashboardKpis.avgTicket)}`} icon={<Receipt className="h-4 w-4" />} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Alert>
            <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
            <AlertTitle>{dashboardKpis.outdatedRecipes} recetas desactualizadas</AlertTitle>
            <AlertDescription>Los costos de insumos cambiaron desde la última vez que se costeó. Revisar para mantener el food cost objetivo.</AlertDescription>
          </Alert>
          <Alert>
            <ShoppingCart className="h-4 w-4 text-destructive" />
            <AlertTitle>{dashboardKpis.ingredientsToReorder} insumos por reponer</AlertTitle>
            <AlertDescription>Hay productos por debajo del punto de pedido. Generá una orden sugerida.</AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Recetas que requieren atención</CardTitle>
                <CardDescription>Borradores y costeos vencidos</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/recetas">Ver todas</Link>
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receta</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Food cost</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Último costeo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...outdated, ...recipes.filter((r) => r.status === "borrador")].map((r) => {
                    const fc = r.salePrice > 0 ? r.totalCost / r.salePrice : 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <ChefHat className="h-4 w-4 text-muted-foreground" />
                            {r.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.category}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(r.totalCost)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(r.salePrice)}</TableCell>
                        <TableCell className="text-right">
                          {r.salePrice > 0 ? <CostBadge foodCost={fc} target={r.targetFoodCost} /> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><RecipeStatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{formatDate(r.lastCostedAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Insumos a reponer</CardTitle>
                <CardDescription>Debajo del punto de pedido</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/pedido-sugerido">Pedido</Link>
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insumo</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{i.stock} {i.unit}</TableCell>
                      <TableCell><StockBadge status={i.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
