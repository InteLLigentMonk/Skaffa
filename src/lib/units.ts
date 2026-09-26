import { Enums } from "./database.types";

export type UnitCode = Enums<"unit_code">;
export type UnitDimension = Enums<"unit_dimension">;

export const DIMENSION_LABELS: Record<UnitDimension, string> = {
  vikt: "Vikt",
  volym: "Volym",
  antal: "Antal",
};

export const UNIT_LABELS: Record<UnitCode, string> = {
  gram: "g",
  kilogram: "kg",
  milliliter: "ml",
  centiliter: "cl",
  deciliter: "dl",
  liter: "l",
  matsked: "msk",
  tesked: "tsk",
  kryddmatt: "krm",
  styck: "st",
};

/**
 * Faktor mot dimensionens basenhet: gram för vikt, milliliter för volym,
 * styck för antal. De svenska volymmåtten är exakta ml-multiplar, så varje
 * faktor är ett heltal och konverteringen är förlustfri.
 *
 * MÅSTE spegla unit_to_base() i 20260908195042_derive_amount_base.sql.
 * Databasen är den som räknar på riktigt — triggern härleder amount_base ur
 * display_amount + display_unit. Tabellen här finns för att kunna visa samma
 * summa innan raden sparas, inte för att skickas in.
 */
export const UNIT_SPECS: Record<
  UnitCode,
  { dimension: UnitDimension; perBase: number }
> = {
  gram: { dimension: "vikt", perBase: 1 },
  kilogram: { dimension: "vikt", perBase: 1000 },
  milliliter: { dimension: "volym", perBase: 1 },
  centiliter: { dimension: "volym", perBase: 10 },
  deciliter: { dimension: "volym", perBase: 100 },
  liter: { dimension: "volym", perBase: 1000 },
  matsked: { dimension: "volym", perBase: 15 },
  tesked: { dimension: "volym", perBase: 5 },
  kryddmatt: { dimension: "volym", perBase: 1 },
  styck: { dimension: "antal", perBase: 1 },
};

export const dimensionOf = (unit: UnitCode): UnitDimension =>
  UNIT_SPECS[unit].dimension;

/** Enheten en ingrediens får som förval när den läggs till i ett recept. */
export const DEFAULT_UNIT: Record<UnitDimension, UnitCode> = {
  vikt: "gram",
  volym: "deciliter",
  antal: "styck",
};

/** Enheterna inom ingrediensens egen dimension. */
const LADDER: Record<UnitDimension, UnitCode[]> = {
  vikt: ["gram", "kilogram"],
  volym: [
    "milliliter",
    "centiliter",
    "deciliter",
    "liter",
    "matsked",
    "tesked",
    "kryddmatt",
  ],
  antal: ["styck"],
};

/**
 * Tvärmått, som bara erbjuds när ingrediensen har en densitet. Listan är kort
 * med flit: ingen mäter mjöl i centiliter, och en väljare med nio alternativ
 * är värre än att sakna funktionen.
 */
const CROSS: Record<UnitDimension, UnitCode[]> = {
  vikt: ["deciliter", "matsked"],
  volym: ["gram", "kilogram"],
  antal: [],
};

export const unitsFor = (
  dimension: UnitDimension,
  density?: number | null,
): UnitCode[] =>
  density == null
    ? LADDER[dimension]
    : [...LADDER[dimension], ...CROSS[dimension]];

/**
 * Räknar om en inmatad mängd till dimensionens basenhet. Returnerar null när
 * konverteringen inte går — tvärmått utan densitet, eller antal mot något
 * annat. Databasens trigger avvisar samma fall med ett exception.
 */
export const toBase = (
  amount: number,
  unit: UnitCode,
  dimension: UnitDimension,
  density?: number | null,
): number | null => {
  const spec = UNIT_SPECS[unit];
  const base = amount * spec.perBase;

  if (spec.dimension === dimension) return base;
  if (density == null) return null;
  if (dimension === "vikt" && spec.dimension === "volym") return base * density;
  if (dimension === "volym" && spec.dimension === "vikt") return base / density;
  return null;
};

/** Motsatsen till toBase: från basenhet till en vald visningsenhet. */
export const fromBase = (
  amountBase: number,
  unit: UnitCode,
  dimension: UnitDimension,
  density?: number | null,
): number | null => {
  const spec = UNIT_SPECS[unit];

  if (spec.dimension === dimension) return amountBase / spec.perBase;
  if (density == null) return null;
  if (dimension === "vikt" && spec.dimension === "volym")
    return amountBase / density / spec.perBase;
  if (dimension === "volym" && spec.dimension === "vikt")
    return (amountBase * density) / spec.perBase;
  return null;
};

/**
 * Enheter att välja mellan vid visning, största först. Bara de runda måtten —
 * en summerad inköpslista ska visa "1,25 l", aldrig "8,3 msk".
 */
const DISPLAY_LADDER: Record<UnitDimension, UnitCode[]> = {
  vikt: ["kilogram", "gram"],
  volym: ["liter", "deciliter", "milliliter"],
  antal: ["styck"],
};

/** Svensk decimalkomma, max två decimaler, inga släpande nollor. */
export const formatNumber = (n: number): string =>
  String(Math.round(n * 100) / 100).replace(".", ",");

export const parseAmount = (input: string): number =>
  Number(input.trim().replace(",", "."));

export const isValidAmount = (input: string): boolean => {
  const n = parseAmount(input);
  return Number.isFinite(n) && n > 0;
};

/**
 * Väljer största enhet som ger ett tal >= 1, så 2000 g blir "2 kg" och
 * 1250 ml blir "1,25 l". Löser skalningen på inköpslistan utan att något
 * behöver lagras annorlunda.
 */
export const formatAmount = (
  amountBase: number,
  dimension: UnitDimension,
): { value: number; unit: UnitCode; label: string } => {
  const ladder = DISPLAY_LADDER[dimension];
  const unit =
    ladder.find((u) => amountBase >= UNIT_SPECS[u].perBase) ??
    ladder[ladder.length - 1];

  const value = amountBase / UNIT_SPECS[unit].perBase;
  return { value, unit, label: `${formatNumber(value)} ${UNIT_LABELS[unit]}` };
};
