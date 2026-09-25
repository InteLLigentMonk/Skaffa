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
