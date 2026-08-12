import { mkdtempSync } from "node:fs";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

function createTempDatabaseUrl() {
  const directory = mkdtempSync(join(tmpdir(), "benny-cost-manager-"));
  return {
    directory,
    url: join(directory, "test.db"),
  };
}

async function loadModules(databaseUrl: string) {
  vi.resetModules();
  process.env.DATABASE_URL = databaseUrl;

  const mutations = await import("./mutations");
  const { db, schema } = await import("../db/client");
  const { ensureDatabaseReady } = await import("../db/init");
  const catalog = await import("./catalog");

  ensureDatabaseReady();

  return { mutations, db, schema, catalog };
}

function createFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

const tempDirectories: string[] = [];

afterEach(() => {
  delete process.env.DATABASE_URL;

  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("data mutations", () => {
  it("updates business settings from form data", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);

    const result = mutations.saveBusinessSettingsFromFormData(
      createFormData({
        businessName: "Benny Centro",
        businessType: "Hamburguesería",
        currencySymbol: "$",
        targetMarginPct: "65",
        maxFoodCostPct: "28",
        taxPct: "21",
      }),
    );

    expect(result.ok).toBe(true);

    const settings = db.select().from(schema.businessSettings).get();
    expect(settings?.businessName).toBe("Benny Centro");
    expect(settings?.targetMarginPct).toBeCloseTo(0.65, 5);
    expect(settings?.maxFoodCostPct).toBeCloseTo(0.28, 5);
  });

  it("creates an ingredient and exposes it through the catalog", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const suppliers = db.select().from(schema.suppliers).all();

    const result = mutations.saveIngredientFromFormData(
      createFormData({
        name: "Pepinillos",
        sku: "PEP-001",
        category: "Conservas",
        supplierId: suppliers[0]!.id,
        purchaseQuantity: "2",
        purchaseUnit: "kg",
        usageUnit: "g",
        purchasePrice: "5000",
        wastePct: "5",
        correctionFactor: "1",
        minDailyConsumption: "100",
        maxDailyConsumption: "300",
        currentStock: "250",
      }),
    );

    expect(result.ok).toBe(true);

    const ingredient = db.select().from(schema.ingredients).all().find((item) => item.name === "Pepinillos");
    expect(ingredient).toBeDefined();
    expect(ingredient?.sku).toBe("PEP-001");
    expect(ingredient?.purchaseQuantity).toBe(2);
    expect(ingredient?.purchaseUnit).toBe("kg");
    expect(ingredient?.usageUnit).toBe("g");
    expect(ingredient?.purchasePrice).toBe(5000);
  });

  it("removes an unused ingredient and blocks removal when it has inventory history", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const suppliers = db.select().from(schema.suppliers).all();

    const createResult = mutations.saveIngredientFromFormData(
      createFormData({
        name: "Descartable test",
        sku: "",
        category: "Pruebas",
        supplierId: suppliers[0]!.id,
        purchaseQuantity: "1",
        purchaseUnit: "u",
        usageUnit: "u",
        purchasePrice: "100",
        wastePct: "0",
        correctionFactor: "1",
        minDailyConsumption: "0",
        maxDailyConsumption: "0",
        currentStock: "0",
      }),
    );

    expect(mutations.removeIngredient(createResult.data!.id).ok).toBe(true);

    const secondResult = mutations.saveIngredientFromFormData(
      createFormData({
        name: "Con historial",
        sku: "",
        category: "Pruebas",
        supplierId: suppliers[0]!.id,
        purchaseQuantity: "1",
        purchaseUnit: "u",
        usageUnit: "u",
        purchasePrice: "100",
        wastePct: "0",
        correctionFactor: "1",
        minDailyConsumption: "0",
        maxDailyConsumption: "0",
        currentStock: "4",
      }),
    );

    mutations.saveInventoryCountFromFormData(
      createFormData({
        ingredientId: secondResult.data!.id,
        quantity: "4",
        unit: "u",
        location: "Depósito",
        countedBy: "QA",
        notes: "",
      }),
    );

    const blocked = mutations.removeIngredient(secondResult.data!.id);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain("historial");
  });

  it("rejects incompatible purchase and usage units", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const suppliers = db.select().from(schema.suppliers).all();

    const result = mutations.saveIngredientFromFormData(
      createFormData({
        name: "Caja de pan",
        sku: "",
        category: "Panificados",
        supplierId: suppliers[0]!.id,
        purchaseQuantity: "1",
        purchaseUnit: "kg",
        usageUnit: "u",
        purchasePrice: "4000",
        wastePct: "0",
        correctionFactor: "1",
        minDailyConsumption: "1",
        maxDailyConsumption: "2",
        currentStock: "1",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.usageUnit).toContain("compatible");
  });

  it("updates recipe pricing and adds a recipe line", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const recipe = db.select().from(schema.recipes).get();
    const ingredient = db.select().from(schema.ingredients).get();

    const pricingResult = mutations.saveRecipeFromFormData(
      createFormData({
        id: recipe!.id,
        name: recipe!.name,
        category: recipe!.category,
        servings: String(recipe!.servings),
        productionWastePct: String(recipe!.productionWastePct * 100),
        targetFoodCostPct: "32",
        currentSalePrice: "9800",
        taxPct: "21",
      }),
    );

    expect(pricingResult.ok).toBe(true);

    const lineResult = mutations.saveRecipeLineFromFormData(
      createFormData({
        recipeId: recipe!.id,
        refType: "ingredient",
        refId: ingredient!.id,
        quantity: "25",
        unit: ingredient!.usageUnit,
      }),
    );

    expect(lineResult.ok).toBe(true);

    const updatedRecipe = db.select().from(schema.recipes).get();
    expect(updatedRecipe?.currentSalePrice).toBe(9800);
    expect(updatedRecipe?.targetMarginPct).toBeCloseTo(0.68, 5);

    const insertedLine = db.select().from(schema.recipeLines).all().find((line) => line.id === lineResult.data!.lineId);
    expect(insertedLine?.ingredientId).toBe(ingredient?.id);
    expect(insertedLine?.quantity).toBe(25);
  });

  it("creates a sub-recipe and allows nested lines", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const ingredient = db.select().from(schema.ingredients).get();
    const existingSubRecipe = db.select().from(schema.subRecipes).get();

    const createResult = mutations.saveSubRecipeFromFormData(
      createFormData({
        name: "Salsa Test",
        outputQuantity: "500",
        outputUnit: "g",
        wastePct: "3",
        correctionFactor: "1",
      }),
    );

    expect(createResult.ok).toBe(true);

    const lineIngredientResult = mutations.saveSubRecipeLineFromFormData(
      createFormData({
        subRecipeId: createResult.data!.id,
        refType: "ingredient",
        refId: ingredient!.id,
        quantity: "50",
        unit: ingredient!.usageUnit,
      }),
    );

    expect(lineIngredientResult.ok).toBe(true);

    const lineSubRecipeResult = mutations.saveSubRecipeLineFromFormData(
      createFormData({
        subRecipeId: createResult.data!.id,
        refType: "subrecipe",
        refId: existingSubRecipe!.id,
        quantity: "20",
        unit: existingSubRecipe!.outputUnit,
      }),
    );

    expect(lineSubRecipeResult.ok).toBe(true);

    const created = db.select().from(schema.subRecipes).all().find((subRecipe) => subRecipe.id === createResult.data!.id);
    expect(created?.name).toBe("Salsa Test");

    const lines = db.select().from(schema.subRecipeLines).all().filter((line) => line.subRecipeId === createResult.data!.id);
    expect(lines).toHaveLength(2);
  });

  it("removes recipes and blocks deleting sub-recipes still referenced by recipes", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const subRecipe = db.select().from(schema.subRecipes).get();

    const recipeResult = mutations.saveRecipeFromFormData(
      createFormData({
        name: "Receta temporal",
        category: "Pruebas",
        servings: "1",
        productionWastePct: "0",
        targetFoodCostPct: "30",
        currentSalePrice: "1000",
        taxPct: "21",
      }),
    );

    mutations.saveRecipeLineFromFormData(
      createFormData({
        recipeId: recipeResult.data!.id,
        refType: "subrecipe",
        refId: subRecipe!.id,
        quantity: "1",
        unit: subRecipe!.outputUnit,
      }),
    );

    const blocked = mutations.removeSubRecipe(subRecipe!.id);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain("recetas");

    const removedRecipe = mutations.removeRecipe(recipeResult.data!.id);
    expect(removedRecipe.ok).toBe(true);
  });

  it("records inventory counts and updates ingredient stock", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const ingredient = db.select().from(schema.ingredients).get();

    const result = mutations.saveInventoryCountFromFormData(
      createFormData({
        ingredientId: ingredient!.id,
        quantity: "42",
        unit: ingredient!.usageUnit,
        location: "Depósito",
        countedBy: "Benny",
        notes: "Conteo nocturno",
      }),
    );

    expect(result.ok).toBe(true);

    const updatedIngredient = db.select().from(schema.ingredients).get();
    expect(updatedIngredient?.currentStock).toBe(42);

    const count = db.select().from(schema.inventoryCounts).all().find((item) => item.id === result.data!.inventoryCountId);
    const line = db.select().from(schema.inventoryCountLines).all().find((item) => item.inventoryCountId === result.data!.inventoryCountId);

    expect(count?.countedBy).toBe("Benny");
    expect(line?.currentQuantity).toBe(42);
    expect(line?.location).toBe("Depósito");
  });

  it("updates monthly ledger totals from weekly amounts", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const line = db.select().from(schema.monthlyLedgerLines).get();

    const result = mutations.saveMonthlyLedgerLineFromFormData(
      createFormData({
        id: line!.id,
        concept: "Ventas mostrador",
        type: line!.type,
        week1Amount: "100",
        week2Amount: "200",
        week3Amount: "300",
        week4Amount: "400",
      }),
    );

    expect(result.ok).toBe(true);

    const updated = db.select().from(schema.monthlyLedgerLines).get();
    expect(updated?.concept).toBe("Ventas mostrador");
    expect(updated?.totalAmount).toBe(1000);
  });

  it("creates a new monthly ledger and clones the previous concept structure", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);

    const result = mutations.createMonthlyLedgerFromFormData(
      createFormData({
        month: "6",
        year: "2026",
      }),
    );

    expect(result.ok).toBe(true);

    const createdLedger = db.select().from(schema.monthlyLedgers).all().find((item) => item.id === result.data!.id);
    const createdLines = db.select().from(schema.monthlyLedgerLines).all().filter((item) => item.monthlyLedgerId === result.data!.id);

    expect(createdLedger?.month).toBe(6);
    expect(createdLines.length).toBeGreaterThanOrEqual(3);
    expect(createdLines.every((line) => line.totalAmount === 0)).toBe(true);
  });

  it("adds and removes monthly ledger lines", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const ledger = db.select().from(schema.monthlyLedgers).get();

    const createResult = mutations.addMonthlyLedgerLineFromFormData(
      createFormData({
        monthlyLedgerId: ledger!.id,
        concept: "Delivery nocturno",
        type: "variable",
      }),
    );

    expect(createResult.ok).toBe(true);

    const createdLine = db.select().from(schema.monthlyLedgerLines).all().find((item) => item.id === createResult.data!.id);
    expect(createdLine?.concept).toBe("Delivery nocturno");

    const removeResult = mutations.removeMonthlyLedgerLine(createResult.data!.id);
    expect(removeResult.ok).toBe(true);

    const deletedLine = db.select().from(schema.monthlyLedgerLines).all().find((item) => item.id === createResult.data!.id);
    expect(deletedLine).toBeUndefined();
  });

  it("generates a persistent purchase suggestion snapshot", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema, catalog } = await loadModules(url);

    const supplier = db.select().from(schema.suppliers).get();
    if (supplier) {
      db.update(schema.suppliers)
        .set({ leadTimeDays: 7, active: true })
        .where(eq(schema.suppliers.id, supplier.id))
        .run();
    }

    const result = mutations.generatePurchaseSuggestionSnapshot("Compra de prueba");
    expect(result.ok).toBe(true);

    const snapshot = db.select().from(schema.purchaseSuggestions).all().find((item) => item.id === result.data!.id);
    const lines = db.select().from(schema.purchaseSuggestionLines).all().filter((item) => item.purchaseSuggestionId === result.data!.id);

    expect(snapshot?.notes).toBe("Compra de prueba");
    expect(lines.length).toBe(result.data!.lines);
    if (lines[0]) {
      expect(lines[0].suggestedQuantity).toBeGreaterThan(0);
      expect(lines[0].reason).toContain("7 días");
    }

    const currentSuggestions = catalog.getPurchaseSuggestions();
    if (currentSuggestions[0]) {
      expect(currentSuggestions[0].coverageDays).toBeGreaterThanOrEqual(3);
    }

    const confirmResult = mutations.updatePurchaseSuggestionStatus(result.data!.id, "confirmed");
    expect(confirmResult.ok).toBe(true);

    const confirmed = db.select().from(schema.purchaseSuggestions).all().find((item) => item.id === result.data!.id);
    expect(confirmed?.status).toBe("confirmed");
  });

  it("creates and updates a supplier with persisted operational fields", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);

    const result = mutations.saveSupplierFromFormData(
      createFormData({
        name: "Proveedor Test",
        contact: "Ana",
        phone: "+54 11 1234-5678",
        leadTimeDays: "4",
        active: "false",
        notes: "Mayorista",
      }),
    );

    expect(result.ok).toBe(true);

    const created = db.select().from(schema.suppliers).all().find((item) => item.id === result.data!.id);
    expect(created?.contact).toBe("Ana");
    expect(created?.phone).toBe("+54 11 1234-5678");
    expect(created?.leadTimeDays).toBe(4);
    expect(created?.active).toBe(false);
  });

  it("blocks deleting suppliers with ingredients and allows deleting unused suppliers", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, db, schema } = await loadModules(url);
    const inUseSupplier = db.select().from(schema.suppliers).get();

    const blocked = mutations.removeSupplier(inUseSupplier!.id);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain("insumos");

    const createResult = mutations.saveSupplierFromFormData(
      createFormData({
        name: "Proveedor descartable",
        contact: "",
        phone: "",
        leadTimeDays: "1",
        active: "true",
        notes: "",
      }),
    );

    const removed = mutations.removeSupplier(createResult.data!.id);
    expect(removed.ok).toBe(true);
  });

  it("calculates break-even from current ledger data instead of fixed hardcoded values", async () => {
    const { directory, url } = createTempDatabaseUrl();
    tempDirectories.push(directory);

    const { mutations, catalog } = await loadModules(url);

    mutations.saveMonthlyLedgerLineFromFormData(
      createFormData({
        id: "ledger-fixed-1",
        concept: "Gastos fijos",
        type: "fixed",
        week1Amount: "1000",
        week2Amount: "1000",
        week3Amount: "1000",
        week4Amount: "1000",
      }),
    );

    mutations.saveMonthlyLedgerLineFromFormData(
      createFormData({
        id: "ledger-income-1",
        concept: "Ventas",
        type: "income",
        week1Amount: "10000",
        week2Amount: "10000",
        week3Amount: "10000",
        week4Amount: "10000",
      }),
    );

    const summary = catalog.getBreakEvenSummary();
    expect(summary.fixedCosts).toBe(4000);
    expect(summary.breakEvenRevenue).toBeGreaterThan(0);
    expect(summary.breakEvenUnits).toBeGreaterThan(0);
  });

  it("marks a recipe as desactualizada when one of its ingredients changes after the last costing", async () => {
    vi.useFakeTimers();

    try {
      const { directory, url } = createTempDatabaseUrl();
      tempDirectories.push(directory);
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

      const { mutations, db, schema, catalog } = await loadModules(url);
      const recipe = db.select().from(schema.recipes).get();
      const ingredient = db.select().from(schema.ingredients).get();

      mutations.saveRecipeFromFormData(
        createFormData({
          id: recipe!.id,
          name: recipe!.name,
          category: recipe!.category,
          servings: String(recipe!.servings),
          productionWastePct: String(recipe!.productionWastePct * 100),
          targetFoodCostPct: "30",
          currentSalePrice: "12000",
          taxPct: "21",
        }),
      );

      mutations.saveRecipeLineFromFormData(
        createFormData({
          recipeId: recipe!.id,
          refType: "ingredient",
          refId: ingredient!.id,
          quantity: "100",
          unit: ingredient!.usageUnit,
        }),
      );

      vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
      mutations.saveIngredientFromFormData(
        createFormData({
          id: ingredient!.id,
          name: ingredient!.name,
          sku: ingredient!.sku ?? "",
          category: ingredient!.category,
          supplierId: ingredient!.supplierId!,
          purchaseQuantity: String(ingredient!.purchaseQuantity),
          purchaseUnit: ingredient!.purchaseUnit,
          usageUnit: ingredient!.usageUnit,
          purchasePrice: String(ingredient!.purchasePrice + 500),
          wastePct: String(ingredient!.wastePct * 100),
          correctionFactor: String(ingredient!.correctionFactor),
          minDailyConsumption: String(ingredient!.minDailyConsumption),
          maxDailyConsumption: String(ingredient!.maxDailyConsumption),
          currentStock: String(ingredient!.currentStock),
        }),
      );

      const updatedRecipe = catalog.getRecipes().find((item) => item.id === recipe!.id);
      expect(updatedRecipe?.status).toBe("desactualizada");
    } finally {
      vi.useRealTimers();
    }
  });
});
