import { supabase } from "@/lib/supabase";
import { parseAmount } from "@/lib/units";
import { RecipeFormValues, RecipeIngredientRow } from "./recipe-types";

export type CreateRecipeInput = Pick<RecipeFormValues, "name" | "servings"> & {
  ingredients: RecipeIngredientRow[];
};

export async function createRecipe(recipe: CreateRecipeInput) {
  const { data, error } = await supabase.rpc("create_recipe", {
    _name: recipe.name,
    _servings: recipe.servings,
    _ingredients: recipe.ingredients.map((row) => ({
      ingredient_id: row.ingredientId,
      display_amount: parseAmount(row.amount),
      display_unit: row.unit,
    })),
  });

  if (error) throw error;
  return data;
}
