"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/domain/format";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: number;
  /** if true, a negative delta is good (e.g., food cost going down) */
  invertDelta?: boolean;
  hint?: string;
  icon?: ReactNode;
}

export function KpiCard({ label, value, delta, invertDelta, hint, icon }: KpiCardProps) {
  const hasDelta = typeof delta === "number";
  const isFlat = hasDelta && delta === 0;
  const isPositive = hasDelta && (invertDelta ? delta < 0 : delta > 0);
  const deltaClass = !hasDelta || isFlat
    ? "text-muted-foreground"
    : isPositive
    ? "text-success"
    : "text-destructive";
  const Icon = !hasDelta || isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </CardDescription>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 text-xs">
          {hasDelta && (
            <span className={cn("flex items-center gap-1 font-medium tabular-nums", deltaClass)}>
              <Icon className="h-3.5 w-3.5" />
              {formatPercent(Math.abs(delta))}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
