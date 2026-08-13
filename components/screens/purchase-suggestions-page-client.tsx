"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  confirmPurchaseSuggestionAction,
  generatePurchaseSuggestionAction,
  type PurchaseSuggestionState,
} from "@/app/pedido-sugerido/actions";
import { PageHeader } from "@/components/domain/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/domain/format";
import type { PurchaseSuggestion } from "@/domain/types";

const initialState: PurchaseSuggestionState = {
  success: null,
  error: null,
  fieldErrors: {},
};

type Snapshot = {
  id: string;
  generatedAt: string;
  status: string;
  notes: string | null;
  lines: Array<{
    id: string;
    ingredientId: string;
    ingredientName: string;
    supplierName: string;
    supplierActive?: boolean;
    currentQuantity: number;
    reorderPoint: number;
    coverageDays?: number;
    suggestedQuantity: number;
    suggestedPackages: number;
    estimatedCost: number;
    reason: string | null;
    unit: string;
    purchasePresentationLabel?: string;
  }>;
} | null;

export function PurchaseSuggestionsPageClient({
  suggestions,
  latestSnapshot,
  currencySymbol,
}: {
  suggestions: PurchaseSuggestion[];
  latestSnapshot: Snapshot;
  currencySymbol: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(generatePurchaseSuggestionAction, initialState);
  const [confirmState, setConfirmState] = useState<PurchaseSuggestionState>(initialState);
  const [isConfirming, startConfirm] = useTransition();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const displayLines = latestSnapshot
    ? latestSnapshot.lines.map((line) => ({
        ingredientId: line.ingredientId,
        ingredientName: line.ingredientName,
        supplierName: line.supplierName,
        supplierActive: line.supplierActive ?? false,
        currentStock: line.currentQuantity,
        reorderPoint: line.reorderPoint,
        coverageDays: line.coverageDays,
        suggestedQty: line.suggestedQuantity,
        unit: line.unit,
        purchasePresentationLabel: line.purchasePresentationLabel,
        unitCost: line.suggestedQuantity > 0 ? line.estimatedCost / line.suggestedQuantity : 0,
        estimatedCost: line.estimatedCost,
        suggestedPackages: line.suggestedPackages,
        reason: line.reason ?? undefined,
      }))
    : suggestions;

  const totalEstimatedCost = displayLines.reduce((total, item) => total + item.estimatedCost, 0);
  const unresolvedSuppliers = displayLines.filter((item) => item.supplierActive === false).length;

  return (
    <div className="flex flex-col">
      <PageHeader title="Pedido sugerido" description="Reposición sugerida según stock actual, cobertura y lead time del proveedor." />
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Insumos a reponer" value={String(displayLines.length)} />
          <MetricCard label="Costo estimado" value={formatCurrency(totalEstimatedCost, currencySymbol)} />
          <MetricCard label="Último snapshot" value={latestSnapshot ? formatDate(latestSnapshot.generatedAt) : "No generado"} />
          <MetricCard label="Alertas proveedor" value={String(unresolvedSuppliers)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generar snapshot de pedido</CardTitle>
            <CardDescription>
              Guarda una foto del pedido sugerido actual para usarlo como referencia operativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">Notas</label>
                <Input name="notes" placeholder="Ej. compra de lunes por la mañana" />
              </div>
              <Button type="submit" size="sm">Generar pedido sugerido</Button>
            </form>

            {state.error ? (
              <Alert className="mt-4">
                <AlertTitle>No se pudo generar</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            {state.success ? (
              <Alert className="mt-4">
                <AlertTitle>Pedido generado</AlertTitle>
                <AlertDescription>{state.success}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">Detalle del pedido</CardTitle>
              <CardDescription>
                {latestSnapshot ? `Snapshot ${latestSnapshot.id} · ${latestSnapshot.status}` : "Vista viva calculada desde stock actual."}
              </CardDescription>
            </div>
            {latestSnapshot ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={latestSnapshot.status === "confirmed" ? "default" : "secondary"}>
                  {latestSnapshot.status === "confirmed" ? "Confirmado" : "Borrador"}
                </Badge>
                {latestSnapshot.status !== "confirmed" ? (
                  <Button
                    size="sm"
                    disabled={isConfirming}
                    onClick={() =>
                      startConfirm(async () => {
                        const result = await confirmPurchaseSuggestionAction(latestSnapshot.id);
                        setConfirmState(result);
                        if (!result.error) {
                          router.refresh();
                        }
                      })
                    }
                  >
                    {isConfirming ? "Confirmando…" : "Confirmar pedido"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-0">
            {confirmState.error ? (
              <div className="px-6">
                <Alert>
                  <AlertTitle>No se pudo confirmar</AlertTitle>
                  <AlertDescription>{confirmState.error}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            {confirmState.success ? (
              <div className="px-6">
                <Alert>
                  <AlertTitle>Pedido actualizado</AlertTitle>
                  <AlertDescription>{confirmState.success}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Stock actual</TableHead>
                  <TableHead className="text-right">Punto pedido</TableHead>
                  <TableHead className="text-right">Cantidad sugerida</TableHead>
                  <TableHead className="text-right">Paquetes</TableHead>
                  <TableHead className="text-right">Costo estimado</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLines.map((item) => (
                  <TableRow key={item.ingredientId}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.ingredientName}</span>
                        {item.purchasePresentationLabel ? (
                          <span className="text-xs text-muted-foreground">{item.purchasePresentationLabel}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">{item.supplierName}</span>
                        <Badge variant={item.supplierActive === false ? "secondary" : "outline"}>
                          {item.supplierActive === false ? "Proveedor inactivo/faltante" : `${item.coverageDays ?? 3} días cobertura`}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(item.currentStock)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(item.reorderPoint ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(item.suggestedQty)} {item.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.suggestedPackages ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.estimatedCost, currencySymbol)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
