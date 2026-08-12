"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecipeStatus } from "@/domain/types";
import { recipeStatusLabel } from "@/domain/labels";

const variantClass: Record<RecipeStatus, string> = {
  actualizada: "bg-success/15 text-success border-success/30 hover:bg-success/15",
  desactualizada: "bg-warning/15 border-warning/40 hover:bg-warning/15 [&]:text-[color:var(--warning)]",
  borrador: "bg-muted text-muted-foreground border-border hover:bg-muted",
};

export function RecipeStatusBadge({
  status,
  className,
}: {
  status: RecipeStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", variantClass[status], className)}>
      {recipeStatusLabel[status]}
    </Badge>
  );
}
