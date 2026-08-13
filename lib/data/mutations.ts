import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { calculatePurchaseSuggestion } from "../costing/engine";
import { canConvertUnit, convertUnit } from "../costing/units";
import type { Unit } from "../costing/types";
import { db, schema } from "../db/client";
import { ensureDatabaseReady } from "../db/init";

const unitSchema = z.enum(["g", "kg", "ml", "l", "u", "docena", "porción"]);

const percentNumber = z.coerce.number().min(0).max(100);
const nonNegativeNumber = z.coerce.number().min(0);
const positiveNumber = z.coerce.number().positive();

const businessSettingsFormSchema = z.object({
  businessName: z.string().trim().min(2, "Ingresá un nombre de negocio válido."),
  businessType: z.string().trim().min(2, "Ingresá el tipo de negocio."),
  currencySymbol: z.string().trim().min(1, "Ingresá un símbolo de moneda.").max(4, "Usá un símbolo corto."),
  targetMarginPct: percentNumber,
  maxFoodCostPct: percentNumber,
  taxPct: percentNumber,
});

const ingredientFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Ingresá un nombre de insumo válido."),
  sku: z.string().trim().optional(),
  category: z.string().trim().min(1, "Ingresá una categoría."),
  supplierId: z.string().trim().min(1, "Seleccioná un proveedor."),
  purchaseQuantity: positiveNumber,
  purchaseUnit: unitSchema,
  usageUnit: unitSchema,
  purchasePrice: nonNegativeNumber,
  wastePct: percentNumber,
  correctionFactor: positiveNumber,
  minDailyConsumption: nonNegativeNumber,
  maxDailyConsumption: nonNegativeNumber,
  currentStock: nonNegativeNumber,
}).superRefine((value, ctx) => {
  if (!canConvertUnit(value.purchaseUnit as Unit, value.usageUnit as Unit)) {
    ctx.addIssue({
      code: "custom",
      path: ["usageUnit"],
      message: "La unidad de uso tiene que ser compatible con la unidad de compra.",
    });
  }

  if (value.maxDailyConsumption < value.minDailyConsumption) {
    ctx.addIssue({
      code: "custom",
      path: ["maxDailyConsumption"],
      message: "El consumo máximo diario no puede ser menor al mínimo.",
    });
  }
});

const recipeFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Ingresá un nombre de receta válido."),
  category: z.string().trim().min(1, "Ingresá una categoría."),
  servings: z.coerce.number().int().min(1, "El rendimiento debe ser al menos 1."),
  productionWastePct: percentNumber,
  targetFoodCostPct: percentNumber.min(1).max(95),
  currentSalePrice: nonNegativeNumber,
  taxPct: percentNumber,
});

const recipeLineFormSchema = z.object({
  recipeId: z.string().trim().min(1, "Receta inválida."),
  lineId: z.string().trim().optional(),
  refType: z.enum(["ingredient", "subrecipe"]),
  refId: z.string().trim().min(1, "Seleccioná un insumo o sub-receta."),
  quantity: positiveNumber,
  unit: unitSchema,
});

const subRecipeFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Ingresá un nombre de sub-receta válido."),
  outputQuantity: positiveNumber,
  outputUnit: unitSchema,
  wastePct: percentNumber,
  correctionFactor: positiveNumber,
});

const subRecipeLineFormSchema = z.object({
  subRecipeId: z.string().trim().min(1, "Sub-receta inválida."),
  lineId: z.string().trim().optional(),
  refType: z.enum(["ingredient", "subrecipe"]),
  refId: z.string().trim().min(1, "Seleccioná un insumo o sub-receta."),
  quantity: positiveNumber,
  unit: unitSchema,
});

const inventoryCountFormSchema = z.object({
  ingredientId: z.string().trim().min(1, "Insumo inválido."),
  quantity: nonNegativeNumber,
  unit: unitSchema,
  location: z.string().trim().optional(),
  countedBy: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const monthlyLedgerLineFormSchema = z.object({
  id: z.string().trim().min(1, "Línea inválida."),
  concept: z.string().trim().min(1, "Ingresá un concepto."),
  type: z.enum(["income", "fixed", "variable"]),
  week1Amount: nonNegativeNumber,
  week2Amount: nonNegativeNumber,
  week3Amount: nonNegativeNumber,
  week4Amount: nonNegativeNumber,
});

const monthlyLedgerFormSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

const newMonthlyLedgerLineFormSchema = z.object({
  monthlyLedgerId: z.string().trim().min(1, "Mes inválido."),
  concept: z.string().trim().min(1, "Ingresá un concepto."),
  type: z.enum(["income", "fixed", "variable"]),
});

const supplierFormSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Ingresá un nombre de proveedor válido."),
  contact: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  leadTimeDays: z.coerce.number().int().min(0).max(90),
  active: z.enum(["true", "false"]).default("true"),
  notes: z.string().trim().optional(),
});

export type MutationFieldErrors = Record<string, string>;

export interface MutationResult<T> {
  ok: boolean;
  message: string;
  fieldErrors?: MutationFieldErrors;
  data?: T;
}

function getFieldErrors(error: z.ZodError): MutationFieldErrors {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const result: MutationFieldErrors = {};

  for (const [key, value] of Object.entries(fieldErrors)) {
    const firstError = value?.[0];
    if (firstError) {
      result[key] = firstError;
    }
  }

  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function toSlugSegment(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function createIngredientId(name: string) {
  const slug = toSlugSegment(name);
  return `${slug || "insumo"}-${randomUUID().slice(0, 8)}`;
}

function createRecipeId(name: string) {
  return createIngredientId(name).replace(/^insumo/, "receta");
}

function createLineId(parentId: string, prefix: string) {
  return `${prefix}-${parentId}-${randomUUID().slice(0, 8)}`;
}

function createMonthlyLedgerId(month: number, year: number) {
  return `ledger-${year}-${String(month).padStart(2, "0")}`;
}

function wouldCreateSubRecipeCycle(parentId: string, nestedId: string, ignoredLineId?: string) {
  if (parentId === nestedId) return true;

  const lines = db.select({
    id: schema.subRecipeLines.id,
    subRecipeId: schema.subRecipeLines.subRecipeId,
    nestedSubRecipeId: schema.subRecipeLines.nestedSubRecipeId,
  }).from(schema.subRecipeLines).all();
  const children = new Map<string, string[]>();

  for (const line of lines) {
    if (line.id === ignoredLineId || !line.nestedSubRecipeId) continue;
    const current = children.get(line.subRecipeId) ?? [];
    current.push(line.nestedSubRecipeId);
    children.set(line.subRecipeId, current);
  }

  const visited = new Set<string>();
  const visit = (currentId: string): boolean => {
    if (currentId === parentId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    return (children.get(currentId) ?? []).some(visit);
  };

  return visit(nestedId);
}

function incompatibleLineError(targetUnit: string, refName: string) {
  return {
    ok: false as const,
    message: `La unidad de la línea no es compatible con la unidad de uso de ${refName} (${targetUnit}).`,
    fieldErrors: { unit: `Usá una unidad compatible con ${targetUnit}.` },
  };
}

export function saveBusinessSettingsFromFormData(formData: FormData): MutationResult<{ id: number }> {
  const parsed = businessSettingsFormSchema.safeParse({
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    currencySymbol: formData.get("currencySymbol"),
    targetMarginPct: formData.get("targetMarginPct"),
    maxFoodCostPct: formData.get("maxFoodCostPct"),
    taxPct: formData.get("taxPct"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los campos marcados.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const row = db.select().from(schema.businessSettings).get();
  const timestamp = nowIso();
  const values = {
    businessName: parsed.data.businessName,
    businessType: parsed.data.businessType,
    currencySymbol: parsed.data.currencySymbol,
    targetMarginPct: parsed.data.targetMarginPct / 100,
    maxFoodCostPct: parsed.data.maxFoodCostPct / 100,
    taxPct: parsed.data.taxPct / 100,
    updatedAt: timestamp,
  };

  if (row) {
    db.update(schema.businessSettings)
      .set(values)
      .where(eq(schema.businessSettings.id, row.id))
      .run();

    return {
      ok: true,
      message: "Configuración actualizada.",
      data: { id: row.id },
    };
  }

  const result = db.insert(schema.businessSettings).values({
    ...values,
    createdAt: timestamp,
  }).run();

  return {
    ok: true,
    message: "Configuración creada.",
    data: { id: Number(result.lastInsertRowid) },
  };
}

export function saveIngredientFromFormData(formData: FormData): MutationResult<{ id: string }> {
  const parsed = ingredientFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    category: formData.get("category"),
    supplierId: formData.get("supplierId"),
    purchaseQuantity: formData.get("purchaseQuantity"),
    purchaseUnit: formData.get("purchaseUnit"),
    usageUnit: formData.get("usageUnit"),
    purchasePrice: formData.get("purchasePrice"),
    wastePct: formData.get("wastePct"),
    correctionFactor: formData.get("correctionFactor"),
    minDailyConsumption: formData.get("minDailyConsumption"),
    maxDailyConsumption: formData.get("maxDailyConsumption"),
    currentStock: formData.get("currentStock"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los datos del insumo.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const supplier = db.select({ id: schema.suppliers.id })
    .from(schema.suppliers)
    .where(eq(schema.suppliers.id, parsed.data.supplierId))
    .get();

  if (!supplier) {
    return {
      ok: false,
      message: "El proveedor seleccionado no existe.",
      fieldErrors: { supplierId: "Proveedor inválido." },
    };
  }

  const timestamp = nowIso();
  const id = parsed.data.id || createIngredientId(parsed.data.name);
  const values = {
    id,
    name: parsed.data.name,
    sku: parsed.data.sku || null,
    category: parsed.data.category,
    supplierId: parsed.data.supplierId,
    purchasePresentationLabel: `${parsed.data.purchaseQuantity} ${parsed.data.purchaseUnit}`,
    purchaseQuantity: parsed.data.purchaseQuantity,
    purchaseUnit: parsed.data.purchaseUnit,
    usageUnit: parsed.data.usageUnit,
    purchasePrice: parsed.data.purchasePrice,
    wastePct: parsed.data.wastePct / 100,
    correctionFactor: parsed.data.correctionFactor,
    minDailyConsumption: parsed.data.minDailyConsumption,
    maxDailyConsumption: parsed.data.maxDailyConsumption,
    currentStock: parsed.data.currentStock,
    updatedAt: timestamp,
  };

  const existing = db.select({ id: schema.ingredients.id, createdAt: schema.ingredients.createdAt })
    .from(schema.ingredients)
    .where(eq(schema.ingredients.id, id))
    .get();

  if (existing) {
    db.update(schema.ingredients)
      .set(values)
      .where(eq(schema.ingredients.id, id))
      .run();

    return {
      ok: true,
      message: "Insumo actualizado.",
      data: { id },
    };
  }

  db.insert(schema.ingredients).values({
    ...values,
    active: true,
    createdAt: timestamp,
  }).run();

  return {
    ok: true,
    message: "Insumo creado.",
    data: { id },
  };
}

export function removeIngredient(id: string): MutationResult<{ id: string }> {
  ensureDatabaseReady();

  const ingredient = db.select()
    .from(schema.ingredients)
    .where(eq(schema.ingredients.id, id))
    .get();

  if (!ingredient) {
    return { ok: false, message: "El insumo ya no existe." };
  }

  const recipeUsage = db.select().from(schema.recipeLines).where(eq(schema.recipeLines.ingredientId, id)).all().length;
  if (recipeUsage > 0) {
    return { ok: false, message: "No podés borrar un insumo que todavía está usado en recetas." };
  }

  const subRecipeUsage = db.select().from(schema.subRecipeLines).where(eq(schema.subRecipeLines.ingredientId, id)).all().length;
  if (subRecipeUsage > 0) {
    return { ok: false, message: "No podés borrar un insumo que todavía está usado en sub-recetas." };
  }

  const inventoryUsage = db.select().from(schema.inventoryCountLines).where(eq(schema.inventoryCountLines.ingredientId, id)).all().length;
  if (inventoryUsage > 0) {
    return { ok: false, message: "No podés borrar un insumo con historial de inventario." };
  }

  const purchaseSnapshotUsage = db.select().from(schema.purchaseSuggestionLines).where(eq(schema.purchaseSuggestionLines.ingredientId, id)).all().length;
  if (purchaseSnapshotUsage > 0) {
    return { ok: false, message: "No podés borrar un insumo con snapshots de pedidos guardados." };
  }

  db.delete(schema.ingredients)
    .where(eq(schema.ingredients.id, id))
    .run();

  return { ok: true, message: "Insumo eliminado.", data: { id } };
}

export function saveRecipeFromFormData(formData: FormData): MutationResult<{ id: string }> {
  const parsed = recipeFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    category: formData.get("category"),
    servings: formData.get("servings"),
    productionWastePct: formData.get("productionWastePct"),
    targetFoodCostPct: formData.get("targetFoodCostPct"),
    currentSalePrice: formData.get("currentSalePrice"),
    taxPct: formData.get("taxPct"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los datos de la receta.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const timestamp = nowIso();
  const id = parsed.data.id || createRecipeId(parsed.data.name);
  const values = {
    id,
    name: parsed.data.name,
    category: parsed.data.category,
    servings: parsed.data.servings,
    productionWastePct: parsed.data.productionWastePct / 100,
    targetMarginPct: 1 - parsed.data.targetFoodCostPct / 100,
    currentSalePrice: parsed.data.currentSalePrice,
    taxPct: parsed.data.taxPct / 100,
    lastCostingAt: timestamp,
    updatedAt: timestamp,
  };

  const existing = db.select({ id: schema.recipes.id })
    .from(schema.recipes)
    .where(eq(schema.recipes.id, id))
    .get();

  if (existing) {
    db.update(schema.recipes)
      .set(values)
      .where(eq(schema.recipes.id, id))
      .run();

    return {
      ok: true,
      message: "Receta actualizada.",
      data: { id },
    };
  }

  db.insert(schema.recipes).values({
    ...values,
    createdAt: timestamp,
  }).run();

  return {
    ok: true,
    message: "Receta creada.",
    data: { id },
  };
}

export function saveRecipeLineFromFormData(formData: FormData): MutationResult<{ recipeId: string; lineId: string }> {
  const parsed = recipeLineFormSchema.safeParse({
    recipeId: formData.get("recipeId"),
    lineId: formData.get("lineId") || undefined,
    refType: formData.get("refType"),
    refId: formData.get("refId"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá la línea de la receta.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const recipe = db.select({ id: schema.recipes.id })
    .from(schema.recipes)
    .where(eq(schema.recipes.id, parsed.data.recipeId))
    .get();

  if (!recipe) {
    return { ok: false, message: "La receta no existe." };
  }

  if (parsed.data.refType === "ingredient") {
    const ingredient = db.select({ id: schema.ingredients.id, name: schema.ingredients.name, usageUnit: schema.ingredients.usageUnit })
      .from(schema.ingredients)
      .where(eq(schema.ingredients.id, parsed.data.refId))
      .get();

    if (!ingredient) {
      return { ok: false, message: "El insumo seleccionado no existe." };
    }

    if (!canConvertUnit(parsed.data.unit as Unit, ingredient.usageUnit as Unit)) {
      return incompatibleLineError(ingredient.usageUnit, ingredient.name);
    }
  } else {
    const subRecipe = db.select({ id: schema.subRecipes.id, name: schema.subRecipes.name, outputUnit: schema.subRecipes.outputUnit })
      .from(schema.subRecipes)
      .where(eq(schema.subRecipes.id, parsed.data.refId))
      .get();

    if (!subRecipe) {
      return { ok: false, message: "La sub-receta seleccionada no existe." };
    }

    if (!canConvertUnit(parsed.data.unit as Unit, subRecipe.outputUnit as Unit)) {
      return incompatibleLineError(subRecipe.outputUnit, subRecipe.name);
    }
  }

  const existingLines = db.select()
    .from(schema.recipeLines)
    .where(eq(schema.recipeLines.recipeId, parsed.data.recipeId))
    .all();

  const lineId = parsed.data.lineId || createLineId(parsed.data.recipeId, "recipe-line");
  const sortOrder =
    parsed.data.lineId
      ? existingLines.find((line) => line.id === parsed.data.lineId)?.sortOrder ?? existingLines.length
      : existingLines.length;

  const values = {
    id: lineId,
    recipeId: parsed.data.recipeId,
    ingredientId: parsed.data.refType === "ingredient" ? parsed.data.refId : null,
    subRecipeId: parsed.data.refType === "subrecipe" ? parsed.data.refId : null,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    sortOrder,
  };

  const existing = existingLines.find((line) => line.id === lineId);

  if (existing) {
    db.update(schema.recipeLines)
      .set(values)
      .where(eq(schema.recipeLines.id, lineId))
      .run();
  } else {
    db.insert(schema.recipeLines).values(values).run();
  }

  db.update(schema.recipes)
    .set({ updatedAt: nowIso(), lastCostingAt: nowIso() })
    .where(eq(schema.recipes.id, parsed.data.recipeId))
    .run();

  return {
    ok: true,
    message: existing ? "Línea actualizada." : "Línea agregada.",
    data: { recipeId: parsed.data.recipeId, lineId },
  };
}

export function removeRecipeLine(lineId: string): MutationResult<{ lineId: string }> {
  ensureDatabaseReady();

  const line = db.select()
    .from(schema.recipeLines)
    .where(eq(schema.recipeLines.id, lineId))
    .get();

  if (!line) {
    return { ok: false, message: "La línea ya no existe." };
  }

  db.delete(schema.recipeLines)
    .where(eq(schema.recipeLines.id, lineId))
    .run();

  db.update(schema.recipes)
    .set({ updatedAt: nowIso(), lastCostingAt: nowIso() })
    .where(eq(schema.recipes.id, line.recipeId))
    .run();

  return {
    ok: true,
    message: "Línea eliminada.",
    data: { lineId },
  };
}

export function removeRecipe(recipeId: string): MutationResult<{ id: string }> {
  ensureDatabaseReady();

  const recipe = db.select()
    .from(schema.recipes)
    .where(eq(schema.recipes.id, recipeId))
    .get();

  if (!recipe) {
    return { ok: false, message: "La receta ya no existe." };
  }

  db.delete(schema.recipes)
    .where(eq(schema.recipes.id, recipeId))
    .run();

  return { ok: true, message: "Receta eliminada.", data: { id: recipeId } };
}

export function saveSubRecipeFromFormData(formData: FormData): MutationResult<{ id: string }> {
  const parsed = subRecipeFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    outputQuantity: formData.get("outputQuantity"),
    outputUnit: formData.get("outputUnit"),
    wastePct: formData.get("wastePct"),
    correctionFactor: formData.get("correctionFactor"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los datos de la sub-receta.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const timestamp = nowIso();
  const id = parsed.data.id || createIngredientId(parsed.data.name).replace(/^insumo/, "subreceta");
  const values = {
    id,
    name: parsed.data.name,
    outputQuantity: parsed.data.outputQuantity,
    outputUnit: parsed.data.outputUnit,
    wastePct: parsed.data.wastePct / 100,
    correctionFactor: parsed.data.correctionFactor,
    updatedAt: timestamp,
  };

  const existing = db.select({ id: schema.subRecipes.id })
    .from(schema.subRecipes)
    .where(eq(schema.subRecipes.id, id))
    .get();

  if (existing) {
    db.update(schema.subRecipes)
      .set(values)
      .where(eq(schema.subRecipes.id, id))
      .run();

    return { ok: true, message: "Sub-receta actualizada.", data: { id } };
  }

  db.insert(schema.subRecipes).values({
    ...values,
    createdAt: timestamp,
  }).run();

  return { ok: true, message: "Sub-receta creada.", data: { id } };
}

export function saveSubRecipeLineFromFormData(formData: FormData): MutationResult<{ subRecipeId: string; lineId: string }> {
  const parsed = subRecipeLineFormSchema.safeParse({
    subRecipeId: formData.get("subRecipeId"),
    lineId: formData.get("lineId") || undefined,
    refType: formData.get("refType"),
    refId: formData.get("refId"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá la línea de la sub-receta.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const subRecipe = db.select({ id: schema.subRecipes.id })
    .from(schema.subRecipes)
    .where(eq(schema.subRecipes.id, parsed.data.subRecipeId))
    .get();

  if (!subRecipe) {
    return { ok: false, message: "La sub-receta no existe." };
  }

  if (parsed.data.refType === "ingredient") {
    const ingredient = db.select({ id: schema.ingredients.id, name: schema.ingredients.name, usageUnit: schema.ingredients.usageUnit })
      .from(schema.ingredients)
      .where(eq(schema.ingredients.id, parsed.data.refId))
      .get();

    if (!ingredient) {
      return { ok: false, message: "El insumo seleccionado no existe." };
    }

    if (!canConvertUnit(parsed.data.unit as Unit, ingredient.usageUnit as Unit)) {
      return incompatibleLineError(ingredient.usageUnit, ingredient.name);
    }
  } else {
    if (wouldCreateSubRecipeCycle(parsed.data.subRecipeId, parsed.data.refId, parsed.data.lineId)) {
      return {
        ok: false,
        message: "La línea crea un ciclo de sub-recetas y no se puede guardar.",
        fieldErrors: { refId: "No se permiten ciclos de dependencia." },
      };
    }

    const nestedSubRecipe = db.select({ id: schema.subRecipes.id, name: schema.subRecipes.name, outputUnit: schema.subRecipes.outputUnit })
      .from(schema.subRecipes)
      .where(eq(schema.subRecipes.id, parsed.data.refId))
      .get();

    if (!nestedSubRecipe) {
      return { ok: false, message: "La sub-receta anidada no existe." };
    }

    if (!canConvertUnit(parsed.data.unit as Unit, nestedSubRecipe.outputUnit as Unit)) {
      return incompatibleLineError(nestedSubRecipe.outputUnit, nestedSubRecipe.name);
    }
  }

  const existingLines = db.select()
    .from(schema.subRecipeLines)
    .where(eq(schema.subRecipeLines.subRecipeId, parsed.data.subRecipeId))
    .all();

  const lineId = parsed.data.lineId || createLineId(parsed.data.subRecipeId, "subrecipe-line");
  const sortOrder =
    parsed.data.lineId
      ? existingLines.find((line) => line.id === parsed.data.lineId)?.sortOrder ?? existingLines.length
      : existingLines.length;

  const values = {
    id: lineId,
    subRecipeId: parsed.data.subRecipeId,
    ingredientId: parsed.data.refType === "ingredient" ? parsed.data.refId : null,
    nestedSubRecipeId: parsed.data.refType === "subrecipe" ? parsed.data.refId : null,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    sortOrder,
  };

  const existing = existingLines.find((line) => line.id === lineId);

  if (existing) {
    db.update(schema.subRecipeLines)
      .set(values)
      .where(eq(schema.subRecipeLines.id, lineId))
      .run();
  } else {
    db.insert(schema.subRecipeLines).values(values).run();
  }

  db.update(schema.subRecipes)
    .set({ updatedAt: nowIso() })
    .where(eq(schema.subRecipes.id, parsed.data.subRecipeId))
    .run();

  return {
    ok: true,
    message: existing ? "Línea actualizada." : "Línea agregada.",
    data: { subRecipeId: parsed.data.subRecipeId, lineId },
  };
}

export function removeSubRecipeLine(lineId: string): MutationResult<{ lineId: string }> {
  ensureDatabaseReady();

  const line = db.select()
    .from(schema.subRecipeLines)
    .where(eq(schema.subRecipeLines.id, lineId))
    .get();

  if (!line) {
    return { ok: false, message: "La línea ya no existe." };
  }

  db.delete(schema.subRecipeLines)
    .where(eq(schema.subRecipeLines.id, lineId))
    .run();

  db.update(schema.subRecipes)
    .set({ updatedAt: nowIso() })
    .where(eq(schema.subRecipes.id, line.subRecipeId))
    .run();

  return {
    ok: true,
    message: "Línea eliminada.",
    data: { lineId },
  };
}

export function removeSubRecipe(id: string): MutationResult<{ id: string }> {
  ensureDatabaseReady();

  const subRecipe = db.select()
    .from(schema.subRecipes)
    .where(eq(schema.subRecipes.id, id))
    .get();

  if (!subRecipe) {
    return { ok: false, message: "La sub-receta ya no existe." };
  }

  const recipeUsage = db.select().from(schema.recipeLines).where(eq(schema.recipeLines.subRecipeId, id)).all().length;
  if (recipeUsage > 0) {
    return { ok: false, message: "No podés borrar una sub-receta que todavía está usada en recetas." };
  }

  const nestedUsage = db.select().from(schema.subRecipeLines).where(eq(schema.subRecipeLines.nestedSubRecipeId, id)).all().length;
  if (nestedUsage > 0) {
    return { ok: false, message: "No podés borrar una sub-receta que todavía está anidada en otra." };
  }

  db.delete(schema.subRecipes)
    .where(eq(schema.subRecipes.id, id))
    .run();

  return { ok: true, message: "Sub-receta eliminada.", data: { id } };
}

export function saveInventoryCountFromFormData(formData: FormData): MutationResult<{ ingredientId: string; inventoryCountId: string }> {
  const parsed = inventoryCountFormSchema.safeParse({
    ingredientId: formData.get("ingredientId"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    location: formData.get("location") || undefined,
    countedBy: formData.get("countedBy") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá el conteo de inventario.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const ingredient = db.select()
    .from(schema.ingredients)
    .where(eq(schema.ingredients.id, parsed.data.ingredientId))
    .get();

  if (!ingredient) {
    return { ok: false, message: "El insumo no existe." };
  }

  if (!canConvertUnit(parsed.data.unit as Unit, ingredient.usageUnit as Unit)) {
    return incompatibleLineError(ingredient.usageUnit, ingredient.name);
  }

  const timestamp = nowIso();
  const inventoryCountId = createLineId(parsed.data.ingredientId, "inventory-count");

  db.transaction((tx) => {
    tx.insert(schema.inventoryCounts).values({
      id: inventoryCountId,
      countedAt: timestamp,
      countedBy: parsed.data.countedBy || null,
      notes: parsed.data.notes || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();

    tx.insert(schema.inventoryCountLines).values({
      id: createLineId(parsed.data.ingredientId, "inventory-line"),
      inventoryCountId,
      ingredientId: parsed.data.ingredientId,
      currentQuantity: parsed.data.quantity,
      unit: parsed.data.unit,
      location: parsed.data.location || null,
    }).run();

      tx.update(schema.ingredients)
      .set({
        currentStock: convertUnit(parsed.data.quantity, parsed.data.unit as Unit, ingredient.usageUnit as Unit),
        updatedAt: timestamp,
      })
      .where(eq(schema.ingredients.id, parsed.data.ingredientId))
      .run();
  });

  return {
    ok: true,
    message: "Stock actualizado.",
    data: { ingredientId: parsed.data.ingredientId, inventoryCountId },
  };
}

export function saveMonthlyLedgerLineFromFormData(formData: FormData): MutationResult<{ id: string }> {
  const parsed = monthlyLedgerLineFormSchema.safeParse({
    id: formData.get("id"),
    concept: formData.get("concept"),
    type: formData.get("type"),
    week1Amount: formData.get("week1Amount"),
    week2Amount: formData.get("week2Amount"),
    week3Amount: formData.get("week3Amount"),
    week4Amount: formData.get("week4Amount"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá la línea financiera.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const existing = db.select()
    .from(schema.monthlyLedgerLines)
    .where(eq(schema.monthlyLedgerLines.id, parsed.data.id))
    .get();

  if (!existing) {
    return { ok: false, message: "La línea financiera no existe." };
  }

  const totalAmount =
    parsed.data.week1Amount +
    parsed.data.week2Amount +
    parsed.data.week3Amount +
    parsed.data.week4Amount;

  db.update(schema.monthlyLedgerLines)
    .set({
      concept: parsed.data.concept,
      type: parsed.data.type,
      week1Amount: parsed.data.week1Amount,
      week2Amount: parsed.data.week2Amount,
      week3Amount: parsed.data.week3Amount,
      week4Amount: parsed.data.week4Amount,
      totalAmount,
    })
    .where(eq(schema.monthlyLedgerLines.id, parsed.data.id))
    .run();

  return {
    ok: true,
    message: "Línea financiera actualizada.",
    data: { id: parsed.data.id },
  };
}

export function createMonthlyLedgerFromFormData(formData: FormData): MutationResult<{ id: string }> {
  const parsed = monthlyLedgerFormSchema.safeParse({
    month: formData.get("month"),
    year: formData.get("year"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá el mes que querés crear.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const ledgerId = createMonthlyLedgerId(parsed.data.month, parsed.data.year);
  const existing = db.select()
    .from(schema.monthlyLedgers)
    .where(eq(schema.monthlyLedgers.id, ledgerId))
    .get();

  if (existing) {
    return {
      ok: false,
      message: "Ese mes ya existe en la app.",
      fieldErrors: { month: "Mes duplicado." },
    };
  }

  const timestamp = nowIso();
  const latestLedger = db.select().from(schema.monthlyLedgers).all().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  })[0];
  const templateLines = latestLedger
    ? db.select()
      .from(schema.monthlyLedgerLines)
      .where(eq(schema.monthlyLedgerLines.monthlyLedgerId, latestLedger.id))
      .all()
    : [];

  db.transaction((tx) => {
    tx.insert(schema.monthlyLedgers).values({
      id: ledgerId,
      month: parsed.data.month,
      year: parsed.data.year,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();

    const lines = templateLines.length > 0
      ? templateLines.map((line, index) => ({
        id: `${ledgerId}-${toSlugSegment(line.concept || line.type)}-${index + 1}`,
        monthlyLedgerId: ledgerId,
        type: line.type,
        concept: line.concept,
        week1Amount: 0,
        week2Amount: 0,
        week3Amount: 0,
        week4Amount: 0,
        totalAmount: 0,
      }))
      : [
        {
          id: `${ledgerId}-ventas-1`,
          monthlyLedgerId: ledgerId,
          type: "income",
          concept: "Ventas",
          week1Amount: 0,
          week2Amount: 0,
          week3Amount: 0,
          week4Amount: 0,
          totalAmount: 0,
        },
        {
          id: `${ledgerId}-gastos-fijos-1`,
          monthlyLedgerId: ledgerId,
          type: "fixed",
          concept: "Gastos fijos",
          week1Amount: 0,
          week2Amount: 0,
          week3Amount: 0,
          week4Amount: 0,
          totalAmount: 0,
        },
        {
          id: `${ledgerId}-gastos-variables-1`,
          monthlyLedgerId: ledgerId,
          type: "variable",
          concept: "Costos variables",
          week1Amount: 0,
          week2Amount: 0,
          week3Amount: 0,
          week4Amount: 0,
          totalAmount: 0,
        },
      ];

    tx.insert(schema.monthlyLedgerLines).values(lines).run();
  });

  return {
    ok: true,
    message: "Mes financiero creado.",
    data: { id: ledgerId },
  };
}

export function addMonthlyLedgerLineFromFormData(formData: FormData): MutationResult<{ id: string; monthlyLedgerId: string }> {
  const parsed = newMonthlyLedgerLineFormSchema.safeParse({
    monthlyLedgerId: formData.get("monthlyLedgerId"),
    concept: formData.get("concept"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá la nueva línea financiera.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const ledger = db.select()
    .from(schema.monthlyLedgers)
    .where(eq(schema.monthlyLedgers.id, parsed.data.monthlyLedgerId))
    .get();

  if (!ledger) {
    return { ok: false, message: "El mes seleccionado no existe." };
  }

  const existingLines = db.select()
    .from(schema.monthlyLedgerLines)
    .where(eq(schema.monthlyLedgerLines.monthlyLedgerId, parsed.data.monthlyLedgerId))
    .all();

  const id = `${parsed.data.monthlyLedgerId}-${toSlugSegment(parsed.data.concept)}-${existingLines.length + 1}`;
  db.insert(schema.monthlyLedgerLines).values({
    id,
    monthlyLedgerId: parsed.data.monthlyLedgerId,
    type: parsed.data.type,
    concept: parsed.data.concept,
    week1Amount: 0,
    week2Amount: 0,
    week3Amount: 0,
    week4Amount: 0,
    totalAmount: 0,
  }).run();

  return {
    ok: true,
    message: "Línea financiera creada.",
    data: { id, monthlyLedgerId: parsed.data.monthlyLedgerId },
  };
}

export function removeMonthlyLedgerLine(lineId: string): MutationResult<{ id: string; monthlyLedgerId: string }> {
  ensureDatabaseReady();

  const existing = db.select()
    .from(schema.monthlyLedgerLines)
    .where(eq(schema.monthlyLedgerLines.id, lineId))
    .get();

  if (!existing) {
    return { ok: false, message: "La línea financiera ya no existe." };
  }

  const siblingCount = db.select()
    .from(schema.monthlyLedgerLines)
    .where(eq(schema.monthlyLedgerLines.monthlyLedgerId, existing.monthlyLedgerId))
    .all()
    .length;

  if (siblingCount <= 1) {
    return {
      ok: false,
      message: "No podés borrar la última línea del mes.",
    };
  }

  db.delete(schema.monthlyLedgerLines)
    .where(eq(schema.monthlyLedgerLines.id, lineId))
    .run();

  return {
    ok: true,
    message: "Línea financiera eliminada.",
    data: { id: lineId, monthlyLedgerId: existing.monthlyLedgerId },
  };
}

export function generatePurchaseSuggestionSnapshot(
  notes?: string,
): MutationResult<{ id: string; lines: number }> {
  ensureDatabaseReady();

  const ingredients = db.select().from(schema.ingredients).all();
  const suppliers = db.select().from(schema.suppliers).all();
  const timestamp = nowIso();
  const suggestionId = createLineId("purchase", "purchase-suggestion");

  const lines = ingredients
    .map((ingredient) => {
      const supplier = suppliers.find((candidate) => candidate.id === ingredient.supplierId);
      const coverageDays = Math.max(supplier?.leadTimeDays ?? 0, 3);
      const suggestion = calculatePurchaseSuggestion({
        ingredient: {
          id: ingredient.id,
          name: ingredient.name,
          purchasePrice: ingredient.purchasePrice,
          purchaseQuantity: ingredient.purchaseQuantity,
          purchaseUnit: ingredient.purchaseUnit as Unit,
          usageUnit: ingredient.usageUnit as Unit,
          wastePct: ingredient.wastePct,
          correctionFactor: ingredient.correctionFactor,
          minDailyConsumption: ingredient.minDailyConsumption,
          maxDailyConsumption: ingredient.maxDailyConsumption,
          currentStock: ingredient.currentStock,
        },
        currentStock: ingredient.currentStock,
        coverageDays,
      });

      const baseReason = !supplier
        ? "Sin proveedor asignado."
        : !supplier.active
          ? "Proveedor inactivo: revisar antes de comprar."
          : `Cobertura calculada para ${coverageDays} días.`;

      return {
        id: createLineId(ingredient.id, "purchase-suggestion-line"),
        purchaseSuggestionId: suggestionId,
        ingredientId: ingredient.id,
        supplierId: ingredient.supplierId ?? null,
        currentQuantity: ingredient.currentStock,
        reorderPoint: suggestion.reorderPoint,
        suggestedQuantity: suggestion.requiredQuantity,
        suggestedPackages: suggestion.suggestedPackages,
        estimatedCost: suggestion.estimatedCost,
        reason: suggestion.shouldReorder
          ? `${baseReason} Por debajo del punto de cobertura.`
          : `${baseReason} Sin reposición inmediata.`,
      };
    })
    .filter((line) => line.suggestedQuantity > 0 || line.suggestedPackages > 0);

  db.transaction((tx) => {
    tx.insert(schema.purchaseSuggestions).values({
      id: suggestionId,
      generatedAt: timestamp,
      status: "draft",
      notes: notes?.trim() || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();

    if (lines.length > 0) {
      tx.insert(schema.purchaseSuggestionLines).values(lines).run();
    }
  });

  return {
    ok: true,
    message: lines.length > 0 ? "Pedido sugerido generado." : "No hay insumos para reponer en este momento.",
    data: { id: suggestionId, lines: lines.length },
  };
}

export function updatePurchaseSuggestionStatus(
  suggestionId: string,
  status: "draft" | "confirmed",
): MutationResult<{ id: string; status: string }> {
  ensureDatabaseReady();

  const suggestion = db.select()
    .from(schema.purchaseSuggestions)
    .where(eq(schema.purchaseSuggestions.id, suggestionId))
    .get();

  if (!suggestion) {
    return { ok: false, message: "El snapshot del pedido ya no existe." };
  }

  db.update(schema.purchaseSuggestions)
    .set({
      status,
      updatedAt: nowIso(),
    })
    .where(eq(schema.purchaseSuggestions.id, suggestionId))
    .run();

  return {
    ok: true,
    message: status === "confirmed" ? "Pedido marcado como confirmado." : "Pedido marcado como borrador.",
    data: { id: suggestionId, status },
  };
}

export function saveSupplierFromFormData(formData: FormData): MutationResult<{ id: string }> {
  const parsed = supplierFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    contact: formData.get("contact") || undefined,
    phone: formData.get("phone") || undefined,
    leadTimeDays: formData.get("leadTimeDays"),
    active: String(formData.get("active") ?? "true"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisá los datos del proveedor.",
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  ensureDatabaseReady();

  const timestamp = nowIso();
  const id = parsed.data.id || createIngredientId(parsed.data.name).replace(/^insumo/, "supplier");
  const values = {
    id,
    name: parsed.data.name,
    contact: parsed.data.contact || null,
    phone: parsed.data.phone || null,
    leadTimeDays: parsed.data.leadTimeDays,
    active: parsed.data.active === "true",
    notes: parsed.data.notes || null,
    updatedAt: timestamp,
  };

  const existing = db.select({ id: schema.suppliers.id })
    .from(schema.suppliers)
    .where(eq(schema.suppliers.id, id))
    .get();

  if (existing) {
    db.update(schema.suppliers).set(values).where(eq(schema.suppliers.id, id)).run();
    return { ok: true, message: "Proveedor actualizado.", data: { id } };
  }

  db.insert(schema.suppliers).values({
    ...values,
    createdAt: timestamp,
  }).run();

  return { ok: true, message: "Proveedor creado.", data: { id } };
}

export function removeSupplier(id: string): MutationResult<{ id: string }> {
  ensureDatabaseReady();

  const supplier = db.select()
    .from(schema.suppliers)
    .where(eq(schema.suppliers.id, id))
    .get();

  if (!supplier) {
    return { ok: false, message: "El proveedor ya no existe." };
  }

  const linkedIngredients = db.select()
    .from(schema.ingredients)
    .where(eq(schema.ingredients.supplierId, id))
    .all().length;
  if (linkedIngredients > 0) {
    return { ok: false, message: "No podés borrar un proveedor que todavía tiene insumos asociados." };
  }

  const purchaseSnapshotUsage = db.select().from(schema.purchaseSuggestionLines).where(eq(schema.purchaseSuggestionLines.supplierId, id)).all().length;
  if (purchaseSnapshotUsage > 0) {
    return { ok: false, message: "No podés borrar un proveedor con snapshots de pedidos guardados." };
  }

  db.delete(schema.suppliers)
    .where(eq(schema.suppliers.id, id))
    .run();

  return { ok: true, message: "Proveedor eliminado.", data: { id } };
}
