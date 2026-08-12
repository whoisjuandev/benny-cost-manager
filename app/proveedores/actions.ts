"use server";

import { revalidatePath } from "next/cache";

import { removeSupplier, saveSupplierFromFormData } from "@/lib/data/mutations";

export interface SupplierMutationState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

function createEmptyState(): SupplierMutationState {
  return {
    success: null,
    error: null,
    fieldErrors: {},
  };
}

export async function saveSupplierAction(
  previousState: SupplierMutationState = createEmptyState(),
  formData: FormData,
): Promise<SupplierMutationState> {
  void previousState;
  const result = saveSupplierFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  revalidatePath("/proveedores");
  revalidatePath("/insumos");
  revalidatePath("/pedido-sugerido");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}

export async function removeSupplierAction(id?: string): Promise<SupplierMutationState> {
  if (!id) {
    return {
      success: null,
      error: "Proveedor inválido.",
      fieldErrors: {},
    };
  }

  const result = removeSupplier(id);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: {},
    };
  }

  revalidatePath("/proveedores");
  revalidatePath("/insumos");
  revalidatePath("/pedido-sugerido");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}
