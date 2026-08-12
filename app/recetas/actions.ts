"use server";

import { revalidatePath } from "next/cache";

import {
  removeRecipe,
  removeRecipeLine,
  saveRecipeFromFormData,
  saveRecipeLineFromFormData,
} from "@/lib/data/mutations";

export interface RecipeMutationState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

function createEmptyState(): RecipeMutationState {
  return {
    success: null,
    error: null,
    fieldErrors: {},
  };
}

function successState(message: string): RecipeMutationState {
  return { success: message, error: null, fieldErrors: {} };
}

function errorState(message: string, fieldErrors: Record<string, string> = {}): RecipeMutationState {
  return { success: null, error: message, fieldErrors };
}

function revalidateRecipeScreens() {
  revalidatePath("/");
  revalidatePath("/recetas");
  revalidatePath("/analisis-precios");
  revalidatePath("/sub-recetas");
}

export async function saveRecipeAction(
  previousState: RecipeMutationState = createEmptyState(),
  formData: FormData,
): Promise<RecipeMutationState> {
  void previousState;
  const result = saveRecipeFromFormData(formData);

  if (!result.ok) {
    return errorState(result.message, result.fieldErrors);
  }

  revalidateRecipeScreens();
  return successState(result.message);
}

export async function saveRecipeLineAction(
  previousState: RecipeMutationState = createEmptyState(),
  formData: FormData,
): Promise<RecipeMutationState> {
  void previousState;
  const result = saveRecipeLineFromFormData(formData);

  if (!result.ok) {
    return errorState(result.message, result.fieldErrors);
  }

  revalidateRecipeScreens();
  return successState(result.message);
}

export async function removeRecipeLineAction(lineId: string): Promise<void> {
  const result = removeRecipeLine(lineId);

  if (!result.ok) {
    throw new Error(result.message);
  }

  revalidateRecipeScreens();
}

export async function removeRecipeAction(recipeId: string): Promise<RecipeMutationState> {
  const result = removeRecipe(recipeId);

  if (!result.ok) {
    return errorState(result.message);
  }

  revalidateRecipeScreens();
  return successState(result.message);
}
