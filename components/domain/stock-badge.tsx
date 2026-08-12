"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StockStatus } from "@/domain/types";
import { stockStatusLabel } from "@/domain/labels";

const variantClass: Record<StockStatus, string> = {
  ok: "bg-success/15 text-success border-success/30 hover:bg-success/15",
  bajo: "bg-warning/15 text-warning-foreground border-warning/40 hover:bg-warning/15 [&]:text-[color:var(--warning)]",
  critico: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15",
  exceso: "bg-info/15 text-info border-info/30 hover:bg-info/15",
};

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", variantClass[status], className)}>
      {stockStatusLabel[status]}
    </Badge>
  );
}
