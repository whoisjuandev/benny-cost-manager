"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { removeSupplierAction, saveSupplierAction, type SupplierMutationState } from "@/app/proveedores/actions";
import { PageHeader } from "@/components/domain/page-header";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier } from "@/domain/types";

const initialState: SupplierMutationState = {
  success: null,
  error: null,
  fieldErrors: {},
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function SuppliersPageClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Proveedores"
        description="Catálogo base de proveedores conectados al costeo."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proveedores cargados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Lead time</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="cursor-pointer" onClick={() => { setEditing(supplier); setOpen(true); }}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.contact ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.phone ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{supplier.leadTimeDays} días</TableCell>
                    <TableCell>
                      <Badge variant={supplier.active ? "default" : "secondary"}>
                        {supplier.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <SupplierDialog
        open={open}
        onOpenChange={setOpen}
        supplier={editing}
        onSaved={() => {
          router.refresh();
          setOpen(false);
        }}
      />
    </div>
  );
}

function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(saveSupplierAction, initialState);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      onSaved();
    }
  }, [onSaved, state.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>Configurá contacto, lead time y estado operativo.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={supplier?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier-name">Nombre</Label>
            <Input id="supplier-name" name="name" defaultValue={supplier?.name ?? ""} />
            <FieldError message={state.fieldErrors.name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="supplier-contact">Contacto</Label>
              <Input id="supplier-contact" name="contact" defaultValue={supplier?.contact ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="supplier-phone">Teléfono</Label>
              <Input id="supplier-phone" name="phone" defaultValue={supplier?.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="supplier-lead">Lead time (días)</Label>
              <Input id="supplier-lead" name="leadTimeDays" type="number" inputMode="numeric" defaultValue={supplier?.leadTimeDays ?? 2} />
              <FieldError message={state.fieldErrors.leadTimeDays} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="supplier-active">Activo</Label>
              <Input id="supplier-active" name="active" defaultValue={String(supplier?.active ?? true)} placeholder="true / false" />
              <FieldError message={state.fieldErrors.active} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier-notes">Notas</Label>
            <Input id="supplier-notes" name="notes" defaultValue="" />
          </div>

          {state.error ? (
            <Alert>
              <AlertTitle>No se pudo guardar</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.success ? (
            <Alert>
              <AlertTitle>Proveedor guardado</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

          {deleteError ? (
            <Alert>
              <AlertTitle>No se pudo eliminar</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {supplier ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">Eliminar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
                    <AlertDialogDescription>
                      Si todavía tiene insumos asociados, la app no va a permitir borrarlo para no dejar referencias rotas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const result = await removeSupplierAction(supplier.id);
                        if (result.error) {
                          setDeleteError(result.error);
                          return;
                        }
                        router.refresh();
                        onOpenChange(false);
                      }}
                    >
                      Eliminar proveedor
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button type="submit">Guardar proveedor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
