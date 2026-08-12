"use server";

import { revalidatePath } from "next/cache";

import { saveInventoryCountFromFormData } from "@/lib/data/mutations";

export interface InventoryMutationState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

function createEmptyState(): InventoryMutationState {
  return {
    success: null,
    error: null,
    fieldErrors: {},
  };
}

export async function saveInventoryCountAction(
  previousState: InventoryMutationState = createEmptyState(),
  formData: FormData,
): Promise<InventoryMutationState> {
  void previousState;
  const result = saveInventoryCountFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  revalidatePath("/");
  revalidatePath("/inventario");
  revalidatePath("/pedido-sugerido");
  revalidatePath("/insumos");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}
