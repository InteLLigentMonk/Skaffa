import { Enums } from "@/lib/database.types";
import { IngredientCategory } from "@/features/ingredients/ingredient-types";
import { UnitCode, UnitDimension } from "@/lib/units";

export type RecipeFormValues = {
  // Genereras i klienten när formuläret öppnas, så att bildens sökväg
  // ({home_id}/{recipe_id}/…) är känd före första sparningen. Gör också
  // sparningen idempotent — se save_recipe.
  id: string;
  name: string;
  servings: number;
  // Sträng i formuläret, tolkas vid sparning. Tom = ingen tid angiven.
  prepMinutes: string;
  ingredients: RecipeIngredientRow[];
  // Objekt, inte strängar: useFieldArray kräver det.
  steps: RecipeStepValue[];
  imagePath: string | null;
};

export type RecipeStepValue = { content: string };

export type RecipeIngredientRow = {
  ingredientId: string;
  homeId: string | null;
  amount: string;
  name: string;
  dimension: UnitDimension;
  density: number | null;
  dietTag: DietClass | null;
  unit: UnitCode;
};

export type DietClass = Enums<"diet_class">;

export const DIET_LABELS: Record<DietClass, string> = {
  kott: "Kött",
  fisk: "Fisk",
  vegetariskt: "Vegetariskt",
};

export const DIET_EMOJI: Record<DietClass, string> = {
  kott: "🥩",
  fisk: "🐟",
  vegetariskt: "🥦",
};

// Samma regel som recipe_facets.diet: kött före fisk, annars vegetariskt.
// Används bara för platshållaren innan receptet finns; därefter är vyn facit.
export const deriveDiet = (
  ingredients: Pick<RecipeIngredientRow, "dietTag">[],
): DietClass | null => {
  if (ingredients.length === 0) return null;
  if (ingredients.some((row) => row.dietTag === "kott")) return "kott";
  if (ingredients.some((row) => row.dietTag === "fisk")) return "fisk";
  return "vegetariskt";
};

// "home" = hemmets egna recept, "explore" = den offentliga receptbanken.
export type RecipeScope = "home" | "explore";

export type RecipeFilters = {
  query: string;
  quick: boolean;
  diet: DietClass | null;
};

export type RecipeCardData = {
  id: string;
  name: string;
  // Sökvägen i Storage är stabil, URL:en är det inte (signerad för hemmets
  // bilder). Kortet cachar bilden på sökvägen.
  imagePath: string | null;
  imageUrl: string | null;
  prepMinutes: number | null;
  diet: DietClass | null;
};

// Favorit är en tagg bland de andra (se set_recipe_favorite i
// 20261008120000_recipe_detail.sql), inte en egen kolumn.
export const FAVORITE_TAG = "favorit";

export type RecipeDetailIngredient = {
  id: string;
  name: string;
  category: IngredientCategory;
  displayAmount: number;
  displayUnit: UnitCode;
};

export type RecipeDetailStep = {
  position: number;
  content: string;
};

export type RecipeDetail = {
  id: string;
  scope: RecipeScope;
  name: string;
  servings: number;
  prepMinutes: number | null;
  diet: DietClass | null;
  // Alltid tom för receptbanken — taggar är hemmets egna.
  tags: string[];
  imagePath: string | null;
  imageUrl: string | null;
  ingredients: RecipeDetailIngredient[];
  steps: RecipeDetailStep[];
};
