"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { saveInventoryCountAction, type InventoryMutationState } from "@/app/inventario/actions";
import { PageHeader } from "@/components/domain/page-header";
import { StockBadge } from "@/components/domain/stock-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/domain/format";
import type { Ingredient, UnitOfMeasure } from "@/domain/types";

const initialState: InventoryMutationState = {
  success: null,
  error: null,
  fieldErrors: {},
};

export function InventoryPageClient({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="flex flex-col">
      <PageHeader title="Inventario" description="Stock actual, punto de pedido y estado de reposición." />
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {ingredients.map((ingredient) => (
          <InventoryCountCard key={ingredient.id} ingredient={ingredient} />
        ))}
      </div>
    </div>
  );
}

function InventoryCountCard({ ingredient }: { ingredient: Ingredient }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveInventoryCountAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{ingredient.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{ingredient.category}</p>
          </div>
          <StockBadge status={ingredient.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Stock actual</div>
            <div className="font-medium tabular-nums">{formatNumber(ingredient.stock)} {ingredient.unit}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Punto de pedido</div>
            <div className="font-medium tabular-nums">{formatNumber(ingredient.reorderPoint)} {ingredient.unit}</div>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="ingredientId" value={ingredient.id} />
          <input type="hidden" name="unit" value={ingredient.unit as UnitOfMeasure} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={`stock-${ingredient.id}`}>Nuevo stock contado</Label>
            <Input
              id={`stock-${ingredient.id}`}
              name="quantity"
              type="number"
              inputMode="decimal"
              defaultValue={ingredient.stock}
              aria-invalid={Boolean(state.fieldErrors.quantity)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`location-${ingredient.id}`}>Ubicación</Label>
              <Input id={`location-${ingredient.id}`} name="location" placeholder="Depósito, freezer…" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`counted-by-${ingredient.id}`}>Contado por</Label>
              <Input id={`counted-by-${ingredient.id}`} name="countedBy" placeholder="Benny" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`notes-${ingredient.id}`}>Notas</Label>
            <Input id={`notes-${ingredient.id}`} name="notes" placeholder="Ajuste por merma, compra parcial, etc." />
          </div>

          {state.error ? (
            <Alert>
              <AlertTitle>No se pudo guardar</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.success ? (
            <Alert>
              <AlertTitle>Conteo guardado</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm">Guardar conteo</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

