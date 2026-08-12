"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { saveBusinessSettings, type SaveBusinessSettingsState } from "@/app/configuracion/actions";
import { PageHeader } from "@/components/domain/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPercent } from "@/domain/format";

const initialState: SaveBusinessSettingsState = {
  success: null,
  error: null,
  fieldErrors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar configuración"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function SettingsPageClient({
  settings,
}: {
  settings: {
    businessName: string;
    businessType: string;
    currencySymbol: string;
    targetMarginPct: number;
    maxFoodCostPct: number;
    taxPct: number;
  } | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveBusinessSettings, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Configuración del negocio" description="Parámetros base que afectan pricing, food cost e importación." />

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingCard label="Negocio" value={settings?.businessName ?? "—"} />
          <SettingCard label="Tipo" value={settings?.businessType ?? "—"} />
          <SettingCard label="Margen objetivo" value={settings ? formatPercent(settings.targetMarginPct) : "—"} />
          <SettingCard label="Food cost máximo" value={settings ? formatPercent(settings.maxFoodCostPct) : "—"} />
          <SettingCard label="IVA" value={settings ? formatPercent(settings.taxPct) : "—"} />
          <SettingCard label="Moneda" value={settings?.currencySymbol ?? "$"} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Editar configuración</CardTitle>
            <CardDescription>
              Estos valores impactan en pricing, tableros y cálculos de referencia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="businessName" className="text-sm font-medium">Nombre del negocio</label>
                <Input id="businessName" name="businessName" defaultValue={settings?.businessName ?? ""} aria-invalid={Boolean(state.fieldErrors.businessName)} />
                <FieldError message={state.fieldErrors.businessName} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="businessType" className="text-sm font-medium">Tipo de negocio</label>
                <Input id="businessType" name="businessType" defaultValue={settings?.businessType ?? ""} aria-invalid={Boolean(state.fieldErrors.businessType)} />
                <FieldError message={state.fieldErrors.businessType} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="currencySymbol" className="text-sm font-medium">Moneda</label>
                  <Input id="currencySymbol" name="currencySymbol" defaultValue={settings?.currencySymbol ?? "$"} aria-invalid={Boolean(state.fieldErrors.currencySymbol)} />
                  <FieldError message={state.fieldErrors.currencySymbol} />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="taxPct" className="text-sm font-medium">IVA (%)</label>
                  <Input id="taxPct" name="taxPct" type="number" inputMode="decimal" defaultValue={settings ? settings.taxPct * 100 : 21} aria-invalid={Boolean(state.fieldErrors.taxPct)} />
                  <FieldError message={state.fieldErrors.taxPct} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="targetMarginPct" className="text-sm font-medium">Margen objetivo (%)</label>
                  <Input id="targetMarginPct" name="targetMarginPct" type="number" inputMode="decimal" defaultValue={settings ? settings.targetMarginPct * 100 : 60} aria-invalid={Boolean(state.fieldErrors.targetMarginPct)} />
                  <FieldError message={state.fieldErrors.targetMarginPct} />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="maxFoodCostPct" className="text-sm font-medium">Food cost máximo (%)</label>
                  <Input id="maxFoodCostPct" name="maxFoodCostPct" type="number" inputMode="decimal" defaultValue={settings ? settings.maxFoodCostPct * 100 : 30} aria-invalid={Boolean(state.fieldErrors.maxFoodCostPct)} />
                  <FieldError message={state.fieldErrors.maxFoodCostPct} />
                </div>
              </div>

              {state.error ? (
                <Alert>
                  <AlertTitle>No se pudo guardar</AlertTitle>
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              ) : null}

              {state.success ? (
                <Alert>
                  <AlertTitle>Configuración guardada</AlertTitle>
                  <AlertDescription>{state.success}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-end">
                <SubmitButton />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

