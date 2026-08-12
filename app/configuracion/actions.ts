"use server";

import { revalidatePath } from "next/cache";

import { saveBusinessSettingsFromFormData } from "@/lib/data/mutations";

export interface SaveBusinessSettingsState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

export async function saveBusinessSettings(
  _previousState: SaveBusinessSettingsState,
  formData: FormData,
): Promise<SaveBusinessSettingsState> {
  const result = saveBusinessSettingsFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  revalidatePath("/");
  revalidatePath("/configuracion");
  revalidatePath("/analisis-precios");

  return {
    success: result.message,
    error: null,
    fieldErrors: {},
  };
}

