"use server";

import { revalidatePath } from "next/cache";

import { removeIngredient, saveIngredientFromFormData } from "@/lib/data/mutations";

export interface SaveIngredientState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

export async function saveIngredient(
  _previousState: SaveIngredientState,
  formData: FormData,
): Promise<SaveIngredientState> {
  const result = saveIngredientFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  revalidatePath("/");
  revalidatePath("/insumos");
  revalidatePath("/recetas");
  revalidatePath("/inventario");
  revalidatePath("/pedido-sugerido");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}

export async function removeIngredientAction(id: string): Promise<SaveIngredientState> {
  const result = removeIngredient(id);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/insumos");
  revalidatePath("/recetas");
  revalidatePath("/inventario");
  revalidatePath("/pedido-sugerido");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}
