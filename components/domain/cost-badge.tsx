"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/domain/format";
import { priceHealthFromFoodCost, priceHealthLabel } from "@/domain/labels";

const variantClass = {
  saludable: "bg-success/15 text-success border-success/30 hover:bg-success/15",
  ajustado: "bg-warning/15 border-warning/40 hover:bg-warning/15 [&]:text-[color:var(--warning)]",
  perdida: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15",
} as const;

/** Visual semáforo for food-cost ratio vs target. Presentational only. */
export function CostBadge({
  foodCost,
  target,
  showValue = true,
  className,
}: {
  foodCost: number;
  target: number;
  showValue?: boolean;
  className?: string;
}) {
  const health = priceHealthFromFoodCost(foodCost, target);
  return (
    <Badge variant="outline" className={cn("font-medium tabular-nums", variantClass[health], className)}>
      {showValue ? `${formatPercent(foodCost)} · ${priceHealthLabel[health]}` : priceHealthLabel[health]}
    </Badge>
  );
}

/** Margin badge: positive = success, low = warning, negative = destructive */
export function MarginBadge({ margin, className }: { margin: number; className?: string }) {
  const cls =
    margin >= 0.55
      ? variantClass.saludable
      : margin >= 0.4
      ? variantClass.ajustado
      : variantClass.perdida;
  return (
    <Badge variant="outline" className={cn("font-medium tabular-nums", cls, className)}>
      {formatPercent(margin)}
    </Badge>
  );
}
