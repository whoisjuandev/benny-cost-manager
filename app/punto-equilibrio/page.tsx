import { PageHeader } from "@/components/domain/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/domain/format";
import { getBreakEvenSummary, getCurrencySymbol } from "@/lib/data/catalog";

export default function BreakEvenPage() {
  const breakEven = getBreakEvenSummary();
  const currencySymbol = getCurrencySymbol();

  return (
    <div className="flex flex-col">
      <PageHeader title="Punto de equilibrio" description="Cuánto necesita vender Benny para no perder plata." />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Costos fijos mensuales" value={formatCurrency(breakEven.fixedCosts, currencySymbol)} />
        <MetricCard label="Ticket promedio" value={formatCurrency(breakEven.avgTicket, currencySymbol)} />
        <MetricCard label="Margen de contribución" value={formatPercent(breakEven.avgContributionMargin)} />
        <MetricCard label="Unidades equilibrio" value={formatNumber(breakEven.breakEvenUnits)} />
        <MetricCard label="Facturación de equilibrio" value={formatCurrency(breakEven.breakEvenRevenue, currencySymbol)} className="md:col-span-2 xl:col-span-4" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
