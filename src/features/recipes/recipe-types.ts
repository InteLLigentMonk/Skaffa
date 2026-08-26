import { UnitType } from "@/lib/types";

export type RecipeFormValues = {
  name: string;
  servings: number;
  ingredients: RecipeIngredientRow[];
  imageUri?: string;
};

export type RecipeIngredientRow = {
  ingredientId: string;
  amount: string;
  name: string;
  unit: UnitType;
};
