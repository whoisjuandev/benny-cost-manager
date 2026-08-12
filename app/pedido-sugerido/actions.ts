"use server";

import { revalidatePath } from "next/cache";

import { generatePurchaseSuggestionSnapshot, updatePurchaseSuggestionStatus } from "@/lib/data/mutations";

export interface PurchaseSuggestionState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

function createEmptyState(): PurchaseSuggestionState {
  return {
    success: null,
    error: null,
    fieldErrors: {},
  };
}

export async function generatePurchaseSuggestionAction(
  previousState: PurchaseSuggestionState = createEmptyState(),
  formData: FormData,
): Promise<PurchaseSuggestionState> {
  void previousState;
  const result = generatePurchaseSuggestionSnapshot(String(formData.get("notes") ?? ""));

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  revalidatePath("/");
  revalidatePath("/pedido-sugerido");
  revalidatePath("/inventario");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}

export async function confirmPurchaseSuggestionAction(
  suggestionId: string,
): Promise<PurchaseSuggestionState> {
  const result = updatePurchaseSuggestionStatus(suggestionId, "confirmed");

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: {},
    };
  }

  revalidatePath("/");
  revalidatePath("/pedido-sugerido");
  revalidatePath("/inventario");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}
