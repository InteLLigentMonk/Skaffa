import { supabase } from "@/lib/supabase";
import { UnitDimension } from "@/lib/units";
import { IngredientCategory, PickerIngredient } from "./ingredient-types";

export const listIngredients = async (): Promise<PickerIngredient[]> => {
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, home_id, name, category, dimension, density_g_per_ml")
    .order("name");

  if (error) throw error;
  return data;
};

export const setIngredientDensity = async (id: string, density: number) => {
  const { error } = await supabase
    .from("ingredients")
    .update({ density_g_per_ml: density })
    .eq("id", id);

  if (error) throw error;
};

export type CreateIngredientInput = {
  homeId: string;
  name: string;
  category: IngredientCategory;
  dimension: UnitDimension;
  // Genererade typen (Enums<"diet_class">) är bredare än kolumnen, som har
  // check (diet_tag in ('kott', 'fisk')). Därför handskriven union.
  dietTag: "kott" | "fisk" | null;
};

export const createIngredient = async ({
  homeId,
  name,
  category,
  dimension,
  dietTag,
}: CreateIngredientInput): Promise<PickerIngredient> => {
  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      home_id: homeId,
      name: name.trim(),
      category,
      dimension,
      diet_tag: dietTag,
    })
    .select("id, home_id, name, category, dimension, density_g_per_ml")
    .single();

  if (error) throw error;
  return data;
};
