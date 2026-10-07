import { Enums } from "@/lib/database.types";
import { UnitCode, UnitDimension } from "@/lib/units";

export type RecipeFormValues = {
  name: string;
  servings: number;
  ingredients: RecipeIngredientRow[];
  imageUri?: string;
};

export type RecipeIngredientRow = {
  ingredientId: string;
  homeId: string | null;
  amount: string;
  name: string;
  dimension: UnitDimension;
  density: number | null;
  unit: UnitCode;
};

export type DietClass = Enums<"diet_class">;

export const DIET_LABELS: Record<DietClass, string> = {
  kott: "Kött",
  fisk: "Fisk",
  vegetariskt: "Vegetariskt",
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
