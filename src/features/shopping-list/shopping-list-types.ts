import {
  CATEGORY_LABELS,
  IngredientCategory,
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

// Kommer en ny kategori till i enumet saknas den i hem som redan sparat en
// ordning. Den hamnar då sist i stället för att försvinna från listan.
export const completeCategoryOrder = (order: IngredientCategory[]) => {
  const all = Object.keys(CATEGORY_LABELS) as IngredientCategory[];
  return [...order, ...all.filter((c) => !order.includes(c))];
};
