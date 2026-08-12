"use server";

import { revalidatePath } from "next/cache";

import {
  removeSubRecipe,
  removeSubRecipeLine,
  saveSubRecipeFromFormData,
  saveSubRecipeLineFromFormData,
} from "@/lib/data/mutations";

export interface SubRecipeMutationState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

function createEmptyState(): SubRecipeMutationState {
  return {
    success: null,
    error: null,
    fieldErrors: {},
  };
}

function successState(message: string): SubRecipeMutationState {
  return { success: message, error: null, fieldErrors: {} };
}

function errorState(message: string, fieldErrors: Record<string, string> = {}): SubRecipeMutationState {
  return { success: null, error: message, fieldErrors };
}

function revalidateSubRecipeScreens() {
  revalidatePath("/");
  revalidatePath("/recetas");
  revalidatePath("/sub-recetas");
  revalidatePath("/analisis-precios");
}

export async function saveSubRecipeAction(
  previousState: SubRecipeMutationState = createEmptyState(),
  formData: FormData,
): Promise<SubRecipeMutationState> {
  void previousState;
  const result = saveSubRecipeFromFormData(formData);

  if (!result.ok) {
    return errorState(result.message, result.fieldErrors);
  }

  revalidateSubRecipeScreens();
  return successState(result.message);
}

export async function saveSubRecipeLineAction(
  previousState: SubRecipeMutationState = createEmptyState(),
  formData: FormData,
): Promise<SubRecipeMutationState> {
  void previousState;
  const result = saveSubRecipeLineFromFormData(formData);

  if (!result.ok) {
    return errorState(result.message, result.fieldErrors);
  }

  revalidateSubRecipeScreens();
  return successState(result.message);
}

export async function removeSubRecipeLineAction(lineId: string): Promise<void> {
  const result = removeSubRecipeLine(lineId);

  if (!result.ok) {
    throw new Error(result.message);
  }

  revalidateSubRecipeScreens();
}

export async function removeSubRecipeAction(subRecipeId: string): Promise<SubRecipeMutationState> {
  const result = removeSubRecipe(subRecipeId);

  if (!result.ok) {
    return errorState(result.message);
  }

  revalidateSubRecipeScreens();
  return successState(result.message);
}
