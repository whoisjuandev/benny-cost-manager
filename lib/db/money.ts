import { customType } from "drizzle-orm/sqlite-core";

/** Domain code works in pesos while SQLite stores exact integer centavos. */
export const money = customType<{ data: number; driverData: number }>({
  dataType() {
    return "integer";
  },
  toDriver(value) {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid monetary value: ${value}`);
    }

    return Math.round(value * 100);
  },
  fromDriver(value) {
    return value / 100;
  },
});
