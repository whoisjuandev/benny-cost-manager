import { describe, expect, it } from "vitest";

import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("uses the configured currency symbol", () => {
    expect(formatCurrency(1234.5, "€")).toContain("€");
  });
});
