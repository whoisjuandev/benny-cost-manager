"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Filter, Plus, Search } from "lucide-react";

import { removeIngredientAction, saveIngredient, type SaveIngredientState } from "@/app/insumos/actions";
import { PageHeader } from "@/components/domain/page-header";
import { StockBadge } from "@/components/domain/stock-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercent } from "@/domain/format";
import type { Ingredient, StockStatus, Supplier, UnitOfMeasure } from "@/domain/types";

const STATUS_OPTIONS: { value: StockStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "ok", label: "En stock" },
  { value: "bajo", label: "Stock bajo" },
  { value: "critico", label: "Crítico" },
  { value: "exceso", label: "Sobre stock" },
];

const UNIT_OPTIONS: UnitOfMeasure[] = ["g", "kg", "ml", "l", "u", "docena"];

const initialState: SaveIngredientState = {
  success: null,
  error: null,
  fieldErrors: {},
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear insumo"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function IngredientsPageClient({
  ingredients,
  suppliers,
  currencySymbol,
}: {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  currencySymbol: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [sheetState, setSheetState] = useState<{
    mode: "create" | "edit";
    ingredient?: Ingredient;
    instance: number;
  } | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(ingredients.map((ingredient) => ingredient.category))).sort(),
    [ingredients],
  );

  const supplierById = useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers],
  );

  const filtered = useMemo(
    () =>
      ingredients.filter((ingredient) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery =
          !normalizedQuery ||
          ingredient.name.toLowerCase().includes(normalizedQuery) ||
          ingredient.sku?.toLowerCase().includes(normalizedQuery);

        const matchesStatus = status === "all" || ingredient.status === status;
        const matchesCategory = category === "all" || ingredient.category === category;

        return matchesQuery && matchesStatus && matchesCategory;
      }),
    [category, ingredients, query, status],
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Insumos"
        description={`${ingredients.length} insumos · ${ingredients.filter((ingredient) => ingredient.status !== "ok").length} requieren atención`}
        actions={
          <Button
            size="sm"
            onClick={() => setSheetState({ mode: "create", instance: Date.now() })}
          >
            <Plus className="h-4 w-4" />
            Nuevo insumo
          </Button>
        }
      />

      <div className="flex flex-col gap-4 p-6">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o SKU…"
                className="pl-8"
                aria-label="Buscar insumo"
              />
            </div>
            <div className="flex gap-2">
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger className="w-[180px]" aria-label="Filtrar por estado">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]" aria-label="Filtrar por categoría">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((currentCategory) => (
                    <SelectItem key={currentCategory} value={currentCategory}>
                      {currentCategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" aria-label="Más filtros">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Punto pedido</TableHead>
                <TableHead className="text-right">Merma</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Actualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No hay insumos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ingredient) => (
                  <TableRow
                    key={ingredient.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setSheetState({
                        mode: "edit",
                        ingredient,
                        instance: Date.now(),
                      })
                    }
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{ingredient.name}</span>
                        {ingredient.sku ? (
                          <span className="text-xs text-muted-foreground tabular-nums">{ingredient.sku}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {ingredient.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplierById[ingredient.supplierId] ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(ingredient.unitCost, currencySymbol)}
                      <span className="ml-1 text-xs text-muted-foreground">/{ingredient.unit}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {ingredient.stock} <span className="text-xs text-muted-foreground">{ingredient.unit}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {ingredient.reorderPoint} {ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatPercent(ingredient.waste)}
                    </TableCell>
                    <TableCell>
                      <StockBadge status={ingredient.status} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatDate(ingredient.lastUpdated)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {sheetState ? (
        <IngredientFormSheet
          key={sheetState.instance}
          ingredient={sheetState.ingredient}
          suppliers={suppliers}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSheetState(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function IngredientFormSheet({
  ingredient,
  suppliers,
  open,
  onOpenChange,
}: {
  ingredient?: Ingredient;
  suppliers: Supplier[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveIngredient, initialState);
  const [supplierId, setSupplierId] = useState(ingredient?.supplierId ?? suppliers[0]?.id ?? "");
  const [purchaseUnit, setPurchaseUnit] = useState<UnitOfMeasure>(ingredient?.purchaseUnit ?? "kg");
  const [usageUnit, setUsageUnit] = useState<UnitOfMeasure>(ingredient?.unit ?? "g");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [onOpenChange, router, state.success]);

  const isEditing = Boolean(ingredient);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar insumo" : "Nuevo insumo"}</SheetTitle>
          <SheetDescription>
            Configurá presentación de compra, unidad de uso, merma y consumo diario.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-5 px-4 py-4">
          <input type="hidden" name="id" value={ingredient?.id ?? ""} />

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="ingredient-name">Nombre</Label>
              <Input id="ingredient-name" name="name" defaultValue={ingredient?.name ?? ""} aria-invalid={Boolean(state.fieldErrors.name)} />
              <FieldError message={state.fieldErrors.name} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-sku">SKU</Label>
              <Input id="ingredient-sku" name="sku" defaultValue={ingredient?.sku ?? ""} aria-invalid={Boolean(state.fieldErrors.sku)} />
              <FieldError message={state.fieldErrors.sku} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-category">Categoría</Label>
              <Input id="ingredient-category" name="category" defaultValue={ingredient?.category ?? ""} aria-invalid={Boolean(state.fieldErrors.category)} />
              <FieldError message={state.fieldErrors.category} />
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="ingredient-supplier">Proveedor</Label>
              <Select name="supplierId" value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="ingredient-supplier" aria-invalid={Boolean(state.fieldErrors.supplierId)}>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors.supplierId} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-purchase-quantity">Cantidad de compra</Label>
              <Input
                id="ingredient-purchase-quantity"
                name="purchaseQuantity"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient?.purchaseQuantity ?? 1}
                aria-invalid={Boolean(state.fieldErrors.purchaseQuantity)}
              />
              <FieldError message={state.fieldErrors.purchaseQuantity} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-purchase-unit">Unidad de compra</Label>
              <Select name="purchaseUnit" value={purchaseUnit} onValueChange={(value) => setPurchaseUnit(value as UnitOfMeasure)}>
                <SelectTrigger id="ingredient-purchase-unit" aria-invalid={Boolean(state.fieldErrors.purchaseUnit)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors.purchaseUnit} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-purchase-price">Precio compra</Label>
              <Input
                id="ingredient-purchase-price"
                name="purchasePrice"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient?.purchasePrice ?? 0}
                aria-invalid={Boolean(state.fieldErrors.purchasePrice)}
              />
              <FieldError message={state.fieldErrors.purchasePrice} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-usage-unit">Unidad de uso</Label>
              <Select name="usageUnit" value={usageUnit} onValueChange={(value) => setUsageUnit(value as UnitOfMeasure)}>
                <SelectTrigger id="ingredient-usage-unit" aria-invalid={Boolean(state.fieldErrors.usageUnit)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors.usageUnit} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-waste">Merma (%)</Label>
              <Input
                id="ingredient-waste"
                name="wastePct"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient ? ingredient.waste * 100 : 0}
                aria-invalid={Boolean(state.fieldErrors.wastePct)}
              />
              <FieldError message={state.fieldErrors.wastePct} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-correction">Factor corrección</Label>
              <Input
                id="ingredient-correction"
                name="correctionFactor"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient?.correctionFactor ?? 1}
                aria-invalid={Boolean(state.fieldErrors.correctionFactor)}
              />
              <FieldError message={state.fieldErrors.correctionFactor} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-min-daily">Consumo mín/día</Label>
              <Input
                id="ingredient-min-daily"
                name="minDailyConsumption"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient?.minDaily ?? 0}
                aria-invalid={Boolean(state.fieldErrors.minDailyConsumption)}
              />
              <FieldError message={state.fieldErrors.minDailyConsumption} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-max-daily">Consumo máx/día</Label>
              <Input
                id="ingredient-max-daily"
                name="maxDailyConsumption"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient?.maxDaily ?? 0}
                aria-invalid={Boolean(state.fieldErrors.maxDailyConsumption)}
              />
              <FieldError message={state.fieldErrors.maxDailyConsumption} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ingredient-stock">Stock actual</Label>
              <Input
                id="ingredient-stock"
                name="currentStock"
                type="number"
                inputMode="decimal"
                defaultValue={ingredient?.stock ?? 0}
                aria-invalid={Boolean(state.fieldErrors.currentStock)}
              />
              <FieldError message={state.fieldErrors.currentStock} />
            </div>
          </div>

          <Alert>
            <AlertTitle>Punto de pedido calculado</AlertTitle>
            <AlertDescription>
              La app calcula el punto de pedido en base al consumo máximo diario y una cobertura de 3 días.
            </AlertDescription>
          </Alert>

          {state.error ? (
            <Alert>
              <AlertTitle>No se pudo guardar</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {deleteError ? (
            <Alert>
              <AlertTitle>No se pudo eliminar</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </SheetClose>
            {isEditing && ingredient ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar insumo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Si este insumo todavía participa en recetas, sub-recetas o inventario, la app no lo va a dejar borrar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const result = await removeIngredientAction(ingredient.id);
                        if (result.error) {
                          setDeleteError(result.error);
                          return;
                        }
                        router.refresh();
                        onOpenChange(false);
                      }}
                    >
                      Eliminar igual
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <SubmitButton isEditing={isEditing} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
