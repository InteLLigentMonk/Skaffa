import {
  CATEGORY_LABELS,
  IngredientCategory,
  PickerIngredient,
} from "@/features/ingredients/ingredient-types";

// Samma som kolumndefaulten på home_settings.category_order i baseline: en
// ungefärlig väg genom en svensk matbutik.
export const DEFAULT_CATEGORY_ORDER: IngredientCategory[] = [
  "produce",
  "fruit",
  "bakery",
  "protein",
  "seafood",
  "dairy",
  "grains",
  "spices",
  "snacks",
  "beverages",
  "frozen",
  "household",
  "other",
];

/**
 * En vara som läggs på varje veckas inköpslista (recurring_items). Alltid
 * kopplad till en ingrediens, så den får kategori och sorteras i
 * butiksordningen. Mängden lagras i basenhet (g, ml eller st), precis som på
 * listan, och är valfri: utan mängd betyder raden bara "kom ihåg".
 */
export type RecurringItem = {
  id: string;
  ingredient: PickerIngredient;
  amountBase: number | null;
};

export type SaveRecurringItemInput = {
  /** null = ny vara. */
  id: string | null;
  homeId: string;
  ingredient: PickerIngredient;
  amountBase: number | null;
};

// Kommer en ny kategori till i enumet saknas den i hem som redan sparat en
// ordning. Den hamnar då sist i stället för att försvinna från listan.
export const completeCategoryOrder = (order: IngredientCategory[]) => {
  const all = Object.keys(CATEGORY_LABELS) as IngredientCategory[];
  return [...order, ...all.filter((c) => !order.includes(c))];
};
