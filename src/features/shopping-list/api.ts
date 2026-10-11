import { IngredientCategory } from "@/features/ingredients/ingredient-types";
import { supabase } from "@/lib/supabase";
import { completeCategoryOrder } from "./shopping-list-types";

/** Hemmets butiksordning: kategorierna i den ordning man går genom affären. */
export async function getCategoryOrder(
  homeId: string,
): Promise<IngredientCategory[]> {
  const { data, error } = await supabase
    .from("home_settings")
    .select("category_order")
    .eq("home_id", homeId)
    .single();

  if (error) throw error;
  return completeCategoryOrder(data.category_order);
}

// .select().single() av samma skäl som setVisibleSlots: en update som RLS
// filtrerar bort träffar noll rader utan att det blir ett fel.
export async function setCategoryOrder(
  homeId: string,
  order: IngredientCategory[],
): Promise<IngredientCategory[]> {
  const { data, error } = await supabase
    .from("home_settings")
    .update({ category_order: order })
    .eq("home_id", homeId)
    .select("category_order")
    .single();

  if (error) throw error;
  return completeCategoryOrder(data.category_order);
}
