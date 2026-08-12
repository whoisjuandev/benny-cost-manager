import { db, schema } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { seedDatabase } from "@/lib/db/seed";

runMigrations();

db.delete(schema.purchaseSuggestionLines).run();
db.delete(schema.purchaseSuggestions).run();
db.delete(schema.inventoryCountLines).run();
db.delete(schema.inventoryCounts).run();
db.delete(schema.recipeLines).run();
db.delete(schema.recipes).run();
db.delete(schema.subRecipeLines).run();
db.delete(schema.subRecipes).run();
db.delete(schema.monthlyLedgerLines).run();
db.delete(schema.monthlyLedgers).run();
db.delete(schema.ingredients).run();
db.delete(schema.suppliers).run();
db.delete(schema.businessSettings).run();

seedDatabase();

console.log("Benny baseline reseeded");
