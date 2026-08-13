"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus2, Plus, Trash2 } from "lucide-react";

import {
  addMonthlyLedgerLineAction,
  createMonthlyLedgerAction,
  removeMonthlyLedgerLineAction,
  saveMonthlyLedgerLineAction,
  type FinanceMutationState,
} from "@/app/finanzas/actions";
import { PageHeader } from "@/components/domain/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { formatCurrency } from "@/domain/format";

const initialState: FinanceMutationState = {
  success: null,
  error: null,
  fieldErrors: {},
};

type MonthlyLedger = {
  id: string;
  month: number;
  year: number;
};

type MonthlyLedgerLine = {
  id: string;
  type: "income" | "fixed" | "variable";
  concept: string;
  week1Amount: number;
  week2Amount: number;
  week3Amount: number;
  week4Amount: number;
  totalAmount: number;
};

function formatLedgerLabel(ledger: MonthlyLedger) {
  return new Date(ledger.year, ledger.month - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function FinancePageClient({
  ledger,
  lines,
  ledgers,
  currencySymbol,
}: {
  ledger: MonthlyLedger;
  lines: MonthlyLedgerLine[];
  ledgers: MonthlyLedger[];
  currencySymbol: string;
}) {
  const totals = lines.reduce(
    (acc, line) => {
      acc[line.type] = (acc[line.type] ?? 0) + line.totalAmount;
      return acc;
    },
    {} as Record<MonthlyLedgerLine["type"], number>,
  );

  const sortedLedgers = useMemo(
    () => [...ledgers].sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year)),
    [ledgers],
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ingresos y gastos"
        description={`Resumen mensual operativo · ${formatLedgerLabel(ledger)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <CreateLedgerDialog />
            <AddLedgerLineDialog ledgerId={ledger.id} />
          </div>
        }
      />
      <div className="flex flex-col gap-4 p-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Mes operativo</CardTitle>
              <CardDescription>Elegí qué mes querés revisar o editar.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedLedgers.map((item) => {
                const active = item.id === ledger.id;
                return (
                  <Button key={item.id} asChild variant={active ? "default" : "outline"} size="sm">
                    <Link href={`/finanzas?ledger=${item.id}`}>{formatLedgerLabel(item)}</Link>
                  </Button>
                );
              })}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard label="Ingresos" value={formatCurrency(totals.income ?? 0, currencySymbol)} />
          <SummaryCard label="Costos fijos" value={formatCurrency(totals.fixed ?? 0, currencySymbol)} />
          <SummaryCard label="Costos variables" value={formatCurrency(totals.variable ?? 0, currencySymbol)} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {lines.map((line) => (
           <FinanceLineCard key={line.id} line={line} currencySymbol={currencySymbol} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function CreateLedgerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FinanceMutationState>(initialState);
  const [pending, startTransition] = useTransition();

  const today = new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus2 data-icon="inline-start" />
          Nuevo mes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear mes financiero</DialogTitle>
          <DialogDescription>Genera un nuevo mes y clona la estructura de conceptos del último disponible.</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await createMonthlyLedgerAction(initialState, formData);
              setState(result);

              if (result.success && result.data?.ledgerId) {
                setOpen(false);
                router.push(`/finanzas?ledger=${result.data.ledgerId}`);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ledger-month">Mes</Label>
              <Input id="ledger-month" name="month" type="number" min={1} max={12} defaultValue={today.getMonth() + 1} />
              <FieldError message={state.fieldErrors.month} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ledger-year">Año</Label>
              <Input id="ledger-year" name="year" type="number" min={2020} max={2100} defaultValue={today.getFullYear()} />
              <FieldError message={state.fieldErrors.year} />
            </div>
          </div>

          {state.error ? (
            <Alert>
              <AlertTitle>No se pudo crear el mes</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando…" : "Crear mes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddLedgerLineDialog({ ledgerId }: { ledgerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MonthlyLedgerLine["type"]>("variable");
  const [state, setState] = useState<FinanceMutationState>(initialState);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Nueva línea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar línea financiera</DialogTitle>
          <DialogDescription>Sumá un nuevo concepto al mes actual. Arranca en cero para que lo completes semana por semana.</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await addMonthlyLedgerLineAction(initialState, formData);
              setState(result);

              if (result.success && result.data?.ledgerId) {
                setOpen(false);
                router.push(`/finanzas?ledger=${result.data.ledgerId}`);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="monthlyLedgerId" value={ledgerId} />
          <input type="hidden" name="type" value={type} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="line-concept">Concepto</Label>
            <Input id="line-concept" name="concept" />
            <FieldError message={state.fieldErrors.concept} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="line-type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as MonthlyLedgerLine["type"])}>
              <SelectTrigger id="line-type">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="fixed">Costo fijo</SelectItem>
                <SelectItem value="variable">Costo variable</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={state.fieldErrors.type} />
          </div>

          {state.error ? (
            <Alert>
              <AlertTitle>No se pudo crear la línea</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando…" : "Crear línea"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FinanceLineCard({ line, currencySymbol }: { line: MonthlyLedgerLine; currencySymbol: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveMonthlyLedgerLineAction, initialState);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const projectedTotal =
    line.week1Amount + line.week2Amount + line.week3Amount + line.week4Amount;

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{line.concept}</CardTitle>
          <CardDescription className="capitalize">{line.type}</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isDeleting}
          onClick={() => {
            setDeleteError(null);
            startDelete(async () => {
              const result = await removeMonthlyLedgerLineAction(line.id);
              if (result.error) {
                setDeleteError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          <Trash2 />
        </Button>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={line.id} />
          <input type="hidden" name="type" value={line.type} />

          <div className="flex flex-col gap-2">
            <Label htmlFor={`concept-${line.id}`}>Concepto</Label>
            <Input id={`concept-${line.id}`} name="concept" defaultValue={line.concept} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <WeekField lineId={line.id} week={1} amount={line.week1Amount} />
            <WeekField lineId={line.id} week={2} amount={line.week2Amount} />
            <WeekField lineId={line.id} week={3} amount={line.week3Amount} />
            <WeekField lineId={line.id} week={4} amount={line.week4Amount} />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Total actual: </span>
            <span className="font-medium tabular-nums">{formatCurrency(line.totalAmount, currencySymbol)}</span>
            <span className="text-muted-foreground"> · total editable base: </span>
            <span className="font-medium tabular-nums">{formatCurrency(projectedTotal, currencySymbol)}</span>
          </div>

          {deleteError ? (
            <Alert>
              <AlertTitle>No se pudo eliminar</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          {state.error ? (
            <Alert>
              <AlertTitle>No se pudo guardar</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.success ? (
            <Alert>
              <AlertTitle>Línea guardada</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm">Guardar línea</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function WeekField({ lineId, week, amount }: { lineId: string; week: 1 | 2 | 3 | 4; amount: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`week-${week}-${lineId}`}>Semana {week}</Label>
      <Input
        id={`week-${week}-${lineId}`}
        name={`week${week}Amount`}
        type="number"
        inputMode="decimal"
        defaultValue={amount}
      />
    </div>
  );
}
