import type { Unit, UnitFamily } from "./types";

const CONVERSIONS: Record<Unit, { family: UnitFamily; factorToBase: number }> = {
  g: { family: "mass", factorToBase: 1 },
  kg: { family: "mass", factorToBase: 1000 },
  ml: { family: "volume", factorToBase: 1 },
  l: { family: "volume", factorToBase: 1000 },
  u: { family: "count", factorToBase: 1 },
  docena: { family: "count", factorToBase: 12 },
  porción: { family: "serving", factorToBase: 1 },
};

export function getUnitFamily(unit: Unit): UnitFamily {
  return CONVERSIONS[unit].family;
}

export function canConvertUnit(from: Unit, to: Unit): boolean {
  return getUnitFamily(from) === getUnitFamily(to);
}

export function convertUnit(value: number, from: Unit, to: Unit): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid value to convert: ${value}`);
  }

  if (!canConvertUnit(from, to)) {
    throw new Error(`Cannot convert unit ${from} to ${to}`);
  }

  const fromDef = CONVERSIONS[from];
  const toDef = CONVERSIONS[to];
  const valueInBase = value * fromDef.factorToBase;
  return valueInBase / toDef.factorToBase;
}
