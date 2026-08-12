"use server";

import { revalidatePath } from "next/cache";

import {
  addMonthlyLedgerLineFromFormData,
  createMonthlyLedgerFromFormData,
  removeMonthlyLedgerLine,
  saveMonthlyLedgerLineFromFormData,
} from "@/lib/data/mutations";

export interface FinanceMutationState {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
  data?: {
    ledgerId?: string;
    lineId?: string;
  };
}

function createEmptyState(): FinanceMutationState {
  return {
    success: null,
    error: null,
    fieldErrors: {},
  };
}

function successState(message: string, data?: FinanceMutationState["data"]): FinanceMutationState {
  revalidatePath("/");
  revalidatePath("/finanzas");
  revalidatePath("/punto-equilibrio");

  return {
    success: message,
    error: null,
    fieldErrors: {},
    data,
  };
}

export async function saveMonthlyLedgerLineAction(
  previousState: FinanceMutationState = createEmptyState(),
  formData: FormData,
): Promise<FinanceMutationState> {
  void previousState;
  const result = saveMonthlyLedgerLineFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  return successState(result.message, { lineId: result.data?.id });
}

export async function createMonthlyLedgerAction(
  previousState: FinanceMutationState = createEmptyState(),
  formData: FormData,
): Promise<FinanceMutationState> {
  void previousState;
  const result = createMonthlyLedgerFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  return successState(result.message, { ledgerId: result.data?.id });
}

export async function addMonthlyLedgerLineAction(
  previousState: FinanceMutationState = createEmptyState(),
  formData: FormData,
): Promise<FinanceMutationState> {
  void previousState;
  const result = addMonthlyLedgerLineFromFormData(formData);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: result.fieldErrors ?? {},
    };
  }

  return successState(result.message, {
    ledgerId: result.data?.monthlyLedgerId,
    lineId: result.data?.id,
  });
}

export async function removeMonthlyLedgerLineAction(lineId: string): Promise<FinanceMutationState> {
  const result = removeMonthlyLedgerLine(lineId);

  if (!result.ok) {
    return {
      success: null,
      error: result.message,
      fieldErrors: {},
    };
  }

  return successState(result.message, {
    ledgerId: result.data?.monthlyLedgerId,
    lineId: result.data?.id,
  });
}
