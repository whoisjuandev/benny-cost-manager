"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Search, Trash2 } from "lucide-react";

import {
  removeSubRecipeAction,
  removeSubRecipeLineAction,
  saveSubRecipeAction,
  saveSubRecipeLineAction,
  type SubRecipeMutationState,
} from "@/app/sub-recetas/actions";
import { PageHeader } from "@/components/domain/page-header";
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
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/domain/format";
import type { Ingredient, UnitOfMeasure } from "@/domain/types";

const initialState: SubRecipeMutationState = {
  success: null,
  error: null,
  fieldErrors: {},
};

const UNIT_OPTIONS: UnitOfMeasure[] = ["g", "kg", "ml", "l", "u", "docena", "porción"];

type SubRecipeDetail = {
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

function MutationAlert({ state }: { state: SubRecipeMutationState }) {
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

export function SubRecipesPageClient({
  subRecipes,
  ingredients,
}: {
  subRecipes: SubRecipeDetail[];
  ingredients: Ingredient[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(subRecipes[0]?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(
    () =>
      subRecipes.filter((subRecipe) =>
        !query.trim() ? true : subRecipe.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, subRecipes],
  );

  const selected = subRecipes.find((item) => item.id === selectedId) ?? subRecipes[0];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Sub-recetas"
        description="Preparaciones reutilizables con costo por unidad de salida."
        actions={
          <SubRecipeFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSaved={() => {
              router.refresh();
              setCreateOpen(false);
            }}
          >
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nueva sub-receta
            </Button>
          </SubRecipeFormDialog>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="gap-3">
            <CardTitle className="text-sm font-semibold">Sub-recetas</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar sub-receta…" className="h-9 pl-8" />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex flex-col gap-1 p-2">
            {filtered.map((subRecipe) => (
              <button
                key={subRecipe.id}
                type="button"
                onClick={() => setSelectedId(subRecipe.id)}
                className={
                  "rounded-md border px-3 py-2 text-left transition-colors " +
                  (selected?.id === subRecipe.id ? "border-ring bg-accent" : "border-transparent hover:bg-accent/60")
                }
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{subRecipe.name}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(subRecipe.costPerOutputUnit)}/{subRecipe.outputUnit}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <SubRecipeEditor subRecipe={selected} ingredients={ingredients} subRecipes={subRecipes} />
        ) : (
          <Card className="flex items-center justify-center p-12 text-center">
            <div className="text-sm text-muted-foreground">No hay sub-recetas cargadas.</div>
          </Card>
        )}
      </div>
    </div>
  );
}

function SubRecipeEditor({
  subRecipe,
  ingredients,
  subRecipes,
}: {
  subRecipe: SubRecipeDetail;
  ingredients: Ingredient[];
  subRecipes: SubRecipeDetail[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{subRecipe.name}</CardTitle>
            <CardDescription>
              Rinde {formatNumber(subRecipe.outputQuantity)} {subRecipe.outputUnit} · Actualizado {formatDate(subRecipe.lastUpdated)}
            </CardDescription>
          </div>
          <SubRecipeFormDialog
            subRecipe={subRecipe}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={() => {
              router.refresh();
              setEditOpen(false);
            }}
          >
            <Button variant="outline" size="sm">Editar sub-receta</Button>
          </SubRecipeFormDialog>
        </div>
      </CardHeader>
      <Separator />

      <div className="grid grid-cols-2 gap-px overflow-hidden border-b bg-border md:grid-cols-4">
        <KpiCell label="Costo total" value={formatCurrency(subRecipe.totalCost)} />
        <KpiCell label="Costo por unidad" value={`${formatCurrency(subRecipe.costPerOutputUnit)}/${subRecipe.outputUnit}`} />
        <KpiCell label="Merma" value={formatPercent(subRecipe.wastePct)} />
        <KpiCell label="Factor corrección" value={formatNumber(subRecipe.correctionFactor)} />
      </div>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Elemento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-[180px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subRecipe.lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Esta sub-receta todavía no tiene componentes.
                </TableCell>
              </TableRow>
            ) : (
              subRecipe.lines.map((line) => (
                <SubRecipeLineRow key={line.id} subRecipeId={subRecipe.id} line={line} />
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
          <AddSubRecipeLineDialog subRecipeId={subRecipe.id} ingredients={ingredients} subRecipes={subRecipes.filter((item) => item.id !== subRecipe.id)} />
          <div className="flex items-center gap-6 text-sm">
            <span className="text-muted-foreground">Total sub-receta</span>
            <span className="text-base font-semibold tabular-nums">{formatCurrency(subRecipe.totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SubRecipeFormDialog({
  children,
  subRecipe,
  open,
  onOpenChange,
  onSaved,
}: {
  children: React.ReactNode;
  subRecipe?: SubRecipeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(saveSubRecipeAction, initialState);
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
          <DialogTitle>{subRecipe ? "Editar sub-receta" : "Nueva sub-receta"}</DialogTitle>
          <DialogDescription>Definí rendimiento, unidad de salida y merma.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={subRecipe?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="subrecipe-name">Nombre</Label>
            <Input id="subrecipe-name" name="name" defaultValue={subRecipe?.name ?? ""} />
            <FieldError message={state.fieldErrors.name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subrecipe-output-quantity">Rinde</Label>
              <Input id="subrecipe-output-quantity" name="outputQuantity" type="number" inputMode="decimal" defaultValue={subRecipe?.outputQuantity ?? 1} />
              <FieldError message={state.fieldErrors.outputQuantity} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subrecipe-output-unit">Unidad de salida</Label>
              <Select name="outputUnit" defaultValue={(subRecipe?.outputUnit as UnitOfMeasure | undefined) ?? "g"}>
                <SelectTrigger id="subrecipe-output-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors.outputUnit} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subrecipe-waste">Merma (%)</Label>
              <Input id="subrecipe-waste" name="wastePct" type="number" inputMode="decimal" defaultValue={(subRecipe?.wastePct ?? 0) * 100} />
              <FieldError message={state.fieldErrors.wastePct} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subrecipe-correction">Factor corrección</Label>
              <Input id="subrecipe-correction" name="correctionFactor" type="number" inputMode="decimal" defaultValue={subRecipe?.correctionFactor ?? 1} />
              <FieldError message={state.fieldErrors.correctionFactor} />
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
            {subRecipe ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar sub-receta</AlertDialogTitle>
                    <AlertDialogDescription>
                      Si esta sub-receta todavía está anidada o usada en recetas, la app la va a bloquear para no romper costos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const result = await removeSubRecipeAction(subRecipe.id);
                        if (result.error) {
                          setDeleteError(result.error);
                          return;
                        }
                        router.refresh();
                        onOpenChange(false);
                      }}
                    >
                      Eliminar sub-receta
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button type="submit">{subRecipe ? "Guardar sub-receta" : "Crear sub-receta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubRecipeLineRow({
  subRecipeId,
  line,
}: {
  subRecipeId: string;
  line: SubRecipeDetail["lines"][number];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveSubRecipeLineAction, initialState);
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
          <input type="hidden" name="subRecipeId" value={subRecipeId} />
          <input type="hidden" name="lineId" value={line.id} />
          <input type="hidden" name="refType" value={line.refType} />
          <input type="hidden" name="refId" value={line.refId} />
          <Input name="quantity" defaultValue={line.quantity} type="number" inputMode="decimal" className="h-8 w-20 text-right tabular-nums" />
          <Select name="unit" defaultValue={line.unit as UnitOfMeasure}>
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm">Guardar</Button>
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
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await removeSubRecipeLineAction(line.id);
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

function AddSubRecipeLineDialog({
  subRecipeId,
  ingredients,
  subRecipes,
}: {
  subRecipeId: string;
  ingredients: Ingredient[];
  subRecipes: SubRecipeDetail[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refType, setRefType] = useState<"ingredient" | "subrecipe">("ingredient");
  const [state, formAction] = useActionState(saveSubRecipeLineAction, initialState);

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
          <DialogTitle>Agregar componente</DialogTitle>
          <DialogDescription>Podés usar insumos o sub-recetas anidadas.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="subRecipeId" value={subRecipeId} />
          <input type="hidden" name="refType" value={refType} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="subrecipe-line-type">Tipo</Label>
            <Select value={refType} onValueChange={(value) => setRefType(value as "ingredient" | "subrecipe")}>
              <SelectTrigger id="subrecipe-line-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingredient">Insumo</SelectItem>
                <SelectItem value="subrecipe">Sub-receta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="subrecipe-line-ref">Elemento</Label>
            <Select name="refId" defaultValue={options[0]?.id}>
              <SelectTrigger id="subrecipe-line-ref">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={state.fieldErrors.refId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subrecipe-line-quantity">Cantidad</Label>
              <Input id="subrecipe-line-quantity" name="quantity" type="number" inputMode="decimal" defaultValue={1} />
              <FieldError message={state.fieldErrors.quantity} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subrecipe-line-unit">Unidad</Label>
              <Select name="unit" defaultValue="u">
                <SelectTrigger id="subrecipe-line-unit">
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
