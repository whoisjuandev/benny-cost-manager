"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Plus, Save, Search, Trash2 } from "lucide-react";

import {
  removeRecipeAction,
  removeRecipeLineAction,
  saveRecipeAction,
  saveRecipeLineAction,
  type RecipeMutationState,
} from "@/app/recetas/actions";
import { CostBadge, MarginBadge } from "@/components/domain/cost-badge";
import { PageHeader } from "@/components/domain/page-header";
import { RecipeStatusBadge } from "@/components/domain/recipe-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatPercent } from "@/domain/format";
import type { Ingredient, Recipe, UnitOfMeasure } from "@/domain/types";

const initialState: RecipeMutationState = {
  success: null,
  error: null,
  fieldErrors: {},
};

const UNIT_OPTIONS: UnitOfMeasure[] = ["g", "kg", "ml", "l", "u", "docena", "porción"];

type SubRecipeOption = {
  id: string;
  name: string;
  outputQuantity: number;
  outputUnit: string;
  wastePct: number;
  correctionFactor: number;
  lastUpdated: string;
  totalCost: number;
  costPerOutputUnit: number;
  lines: Array<{
    id: string;
    refType: "ingredient" | "subrecipe";
    refId: string;
    refName: string;
    quantity: number;
    unit: string;
    unitCost: number;
  }>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function MutationAlert({ state }: { state: RecipeMutationState }) {
  if (state.error) {
    return (
      <Alert>
        <AlertTitle>No se pudo guardar</AlertTitle>
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  if (state.success) {
    return (
      <Alert>
        <AlertTitle>Cambios guardados</AlertTitle>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function RecipesPageClient({
  recipes,
  ingredients,
  subRecipes,
}: {
  recipes: Recipe[];
  ingredients: Ingredient[];
  subRecipes: SubRecipeOption[];
}) {
  const router = useRouter();
  const list = recipes.filter((recipe) => !recipe.isSubrecipe);
  const [selectedId, setSelectedId] = useState<string>(list[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(
    () =>
      list.filter((recipe) =>
        !query.trim() ? true : recipe.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [list, query],
  );

  const selected = list.find((recipe) => recipe.id === selectedId) ?? list[0];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Recetas"
        description={`${list.length} recetas · ${list.filter((recipe) => recipe.status === "desactualizada").length} desactualizadas`}
        actions={
          <RecipeFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSaved={() => {
              router.refresh();
              setCreateOpen(false);
            }}
          >
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nueva receta
            </Button>
          </RecipeFormDialog>
        }
      />

      <div className="grid flex-1 grid-cols-1 gap-0 p-6 lg:grid-cols-[360px_1fr] lg:gap-6">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="gap-3">
            <CardTitle className="text-sm font-semibold">Catálogo</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar receta…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-8"
                aria-label="Buscar receta"
              />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex flex-col gap-1 p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin resultados.
              </div>
            ) : (
              filtered.map((recipe) => {
                const foodCost = recipe.salePrice > 0 ? recipe.totalCost / recipe.salePrice : 0;
                const isActive = recipe.id === selected?.id;

                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setSelectedId(recipe.id)}
                    className={
                      "group flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors " +
                      (isActive ? "border-ring bg-accent" : "border-transparent hover:bg-accent/60")
                    }
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{recipe.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{recipe.category}</span>
                        <span>·</span>
                        <span className="tabular-nums">{formatCurrency(recipe.salePrice)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RecipeStatusBadge status={recipe.status} />
                      {recipe.salePrice > 0 ? (
                        <CostBadge foodCost={foodCost} target={recipe.targetFoodCost} showValue={false} />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {selected ? (
          <RecipeEditor recipe={selected} ingredients={ingredients} subRecipes={subRecipes} />
        ) : (
          <EmptyEditor />
        )}
      </div>
    </div>
  );
}

function EmptyEditor() {
  return (
    <Card className="flex items-center justify-center p-12 text-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <ChefHat className="h-8 w-8" />
        <p className="text-sm">Seleccioná una receta para editarla.</p>
      </div>
    </Card>
  );
}

function RecipeEditor({
  recipe,
  ingredients,
  subRecipes,
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  subRecipes: SubRecipeOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const foodCost = recipe.salePrice > 0 ? recipe.totalCost / recipe.salePrice : 0;
  const margin = recipe.salePrice > 0 ? 1 - foodCost : 0;
  const priceWithIva = recipe.salePrice * (1 + recipe.ivaRate);
  const suggestedPrice = recipe.targetFoodCost > 0 ? recipe.totalCost / recipe.targetFoodCost : 0;
  const [pricingState, pricingAction] = useActionState(saveRecipeAction, initialState);

  useEffect(() => {
    if (pricingState.success) {
      router.refresh();
    }
  }, [pricingState.success, router]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{recipe.name}</CardTitle>
              <RecipeStatusBadge status={recipe.status} />
            </div>
            <CardDescription>
              {recipe.category} · Rinde {recipe.yieldQty} {recipe.yieldUnit} · Último costeo {formatDate(recipe.lastCostedAt)}
            </CardDescription>
          </div>
          <RecipeFormDialog
            recipe={recipe}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={() => {
              router.refresh();
              setEditOpen(false);
            }}
          >
            <Button variant="outline" size="sm">Editar receta</Button>
          </RecipeFormDialog>
        </div>
      </CardHeader>
      <Separator />

      <div className="grid grid-cols-2 gap-px overflow-hidden border-b bg-border md:grid-cols-4">
        <KpiCell label="Costo total" value={formatCurrency(recipe.totalCost)} />
        <KpiCell label="Precio venta" value={formatCurrency(recipe.salePrice)} hint={`c/ IVA ${formatCurrency(priceWithIva)}`} />
        <KpiCell label="Food cost" value={<CostBadge foodCost={foodCost} target={recipe.targetFoodCost} />} hint={`objetivo ${formatPercent(recipe.targetFoodCost)}`} />
        <KpiCell label="Margen bruto" value={<MarginBadge margin={margin} />} hint={`sugerido ${formatCurrency(suggestedPrice)}`} />
      </div>

      <CardContent className="p-0">
        <Tabs defaultValue="ingredients" className="gap-0">
          <TabsList className="m-4 mb-0">
            <TabsTrigger value="ingredients">Insumos y sub-recetas</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients" className="m-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[180px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipe.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Aún no agregaste insumos a esta receta.
                    </TableCell>
                  </TableRow>
                ) : (
                  recipe.lines.map((line) => (
                    <RecipeLineRow key={line.id} recipeId={recipe.id} line={line} />
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
              <AddRecipeLineDialog recipeId={recipe.id} ingredients={ingredients} subRecipes={subRecipes} />
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">Total receta</span>
                <span className="text-base font-semibold tabular-nums">{formatCurrency(recipe.totalCost)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="m-0 p-6">
            <form action={pricingAction} className="flex max-w-2xl flex-col gap-4">
              <input type="hidden" name="id" value={recipe.id} />
              <input type="hidden" name="name" value={recipe.name} />
              <input type="hidden" name="category" value={recipe.category} />
              <input type="hidden" name="servings" value={recipe.yieldQty} />
              <input type="hidden" name="productionWastePct" value={(recipe.productionWastePct ?? 0) * 100} />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`recipe-price-${recipe.id}`}>Precio de venta (sin IVA)</Label>
                  <Input id={`recipe-price-${recipe.id}`} name="currentSalePrice" type="number" inputMode="decimal" defaultValue={recipe.salePrice} />
                  <FieldError message={pricingState.fieldErrors.currentSalePrice} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`recipe-iva-${recipe.id}`}>IVA (%)</Label>
                  <Input id={`recipe-iva-${recipe.id}`} name="taxPct" type="number" inputMode="decimal" defaultValue={recipe.ivaRate * 100} />
                  <FieldError message={pricingState.fieldErrors.taxPct} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`recipe-food-cost-${recipe.id}`}>Food cost objetivo (%)</Label>
                  <Input id={`recipe-food-cost-${recipe.id}`} name="targetFoodCostPct" type="number" inputMode="decimal" defaultValue={recipe.targetFoodCost * 100} />
                  <FieldError message={pricingState.fieldErrors.targetFoodCostPct} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Precio sugerido</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm tabular-nums">
                    {formatCurrency(suggestedPrice)}
                  </div>
                </div>
              </div>

              <MutationAlert state={pricingState} />

              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  <Save className="h-4 w-4" />
                  Guardar pricing
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="notes" className="m-0 p-6">
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              La app ya persiste costo, pricing y líneas. El siguiente paso es guardar procedimiento operativo.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RecipeLineRow({
  recipeId,
  line,
}: {
  recipeId: string;
  line: Recipe["lines"][number];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveRecipeLineAction, initialState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <TableRow>
      <TableCell className="font-medium">{line.refName}</TableCell>
      <TableCell className="text-muted-foreground capitalize">
        {line.refType === "subrecipe" ? "Sub-receta" : "Insumo"}
      </TableCell>
      <TableCell className="text-right">
        <form action={formAction} className="flex items-center justify-end gap-2">
          <input type="hidden" name="recipeId" value={recipeId} />
          <input type="hidden" name="lineId" value={line.id} />
          <input type="hidden" name="refType" value={line.refType} />
          <input type="hidden" name="refId" value={line.refId} />
          <Input
            name="quantity"
            defaultValue={line.quantity}
            type="number"
            inputMode="decimal"
            className="h-8 w-20 text-right tabular-nums"
            aria-label={`Cantidad de ${line.refName}`}
          />
          <Select name="unit" defaultValue={line.unit}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm">
            Guardar
          </Button>
        </form>
        <FieldError message={state.fieldErrors.quantity || state.fieldErrors.unit} />
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatCurrency(line.unitCost)}/{line.unit}
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">
        {formatCurrency(line.unitCost * line.quantity)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Eliminar línea"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await removeRecipeLineAction(line.id);
                router.refresh();
              })
            }
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function KpiCell({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function RecipeFormDialog({
  children,
  recipe,
  open,
  onOpenChange,
  onSaved,
}: {
  children: React.ReactNode;
  recipe?: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(saveRecipeAction, initialState);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      onSaved();
    }
  }, [onSaved, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar receta" : "Nueva receta"}</DialogTitle>
          <DialogDescription>
            Definí nombre, rendimiento, objetivos y precio base.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={recipe?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="recipe-name">Nombre</Label>
            <Input id="recipe-name" name="name" defaultValue={recipe?.name ?? ""} />
            <FieldError message={state.fieldErrors.name} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="recipe-category">Categoría</Label>
            <Input id="recipe-category" name="category" defaultValue={recipe?.category ?? ""} />
            <FieldError message={state.fieldErrors.category} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipe-servings">Rinde</Label>
              <Input id="recipe-servings" name="servings" type="number" inputMode="numeric" defaultValue={recipe?.yieldQty ?? 1} />
              <FieldError message={state.fieldErrors.servings} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipe-waste">Merma producción (%)</Label>
              <Input id="recipe-waste" name="productionWastePct" type="number" inputMode="decimal" defaultValue={(recipe?.productionWastePct ?? 0) * 100} />
              <FieldError message={state.fieldErrors.productionWastePct} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipe-target">Food cost objetivo (%)</Label>
              <Input id="recipe-target" name="targetFoodCostPct" type="number" inputMode="decimal" defaultValue={recipe ? recipe.targetFoodCost * 100 : 30} />
              <FieldError message={state.fieldErrors.targetFoodCostPct} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipe-price">Precio venta (sin IVA)</Label>
              <Input id="recipe-price" name="currentSalePrice" type="number" inputMode="decimal" defaultValue={recipe?.salePrice ?? 0} />
              <FieldError message={state.fieldErrors.currentSalePrice} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipe-tax">IVA (%)</Label>
              <Input id="recipe-tax" name="taxPct" type="number" inputMode="decimal" defaultValue={recipe ? recipe.ivaRate * 100 : 21} />
              <FieldError message={state.fieldErrors.taxPct} />
            </div>
          </div>

          <MutationAlert state={state} />
          {deleteError ? (
            <Alert>
              <AlertTitle>No se pudo eliminar</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {recipe ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar receta</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto borra la receta y sus líneas. Usalo sólo si ya no querés costearla más en la app.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const result = await removeRecipeAction(recipe.id);
                        if (result.error) {
                          setDeleteError(result.error);
                          return;
                        }
                        router.refresh();
                        onOpenChange(false);
                      }}
                    >
                      Eliminar receta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button type="submit">{recipe ? "Guardar receta" : "Crear receta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddRecipeLineDialog({
  recipeId,
  ingredients,
  subRecipes,
}: {
  recipeId: string;
  ingredients: Ingredient[];
  subRecipes: SubRecipeOption[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveRecipeLineAction, initialState);
  const [open, setOpen] = useState(false);
  const [refType, setRefType] = useState<"ingredient" | "subrecipe">("ingredient");

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const options = refType === "ingredient" ? ingredients : subRecipes;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Agregar línea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar insumo o sub-receta</DialogTitle>
          <DialogDescription>
            La app recalcula automáticamente el costo después de guardar.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="recipeId" value={recipeId} />
          <input type="hidden" name="refType" value={refType} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="line-type">Tipo</Label>
            <Select value={refType} onValueChange={(value) => setRefType(value as "ingredient" | "subrecipe")}>
              <SelectTrigger id="line-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingredient">Insumo</SelectItem>
                <SelectItem value="subrecipe">Sub-receta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="line-ref">Elemento</Label>
            <Select name="refId" defaultValue={options[0]?.id}>
              <SelectTrigger id="line-ref">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={state.fieldErrors.refId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="line-quantity">Cantidad</Label>
              <Input id="line-quantity" name="quantity" type="number" inputMode="decimal" defaultValue={1} />
              <FieldError message={state.fieldErrors.quantity} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="line-unit">Unidad</Label>
              <Select name="unit" defaultValue="u">
                <SelectTrigger id="line-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors.unit} />
            </div>
          </div>

          <MutationAlert state={state} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
