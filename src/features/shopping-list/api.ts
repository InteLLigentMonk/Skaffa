import { IngredientCategory } from "@/features/ingredients/ingredient-types";
import { supabase } from "@/lib/supabase";
import {
  completeCategoryOrder,
  RecurringItem,
  SaveRecurringItemInput,
} from "./shopping-list-types";

const INGREDIENT_COLUMNS =
  "id, home_id, name, category, dimension, density_g_per_ml, diet_tag";

/** Hemmets återkommande varor, i bokstavsordning. RLS begränsar till hemmet. */
export async function getRecurringItems(): Promise<RecurringItem[]> {
  const { data, error } = await supabase
    .from("recurring_items")
    .select(`id, amount_base, ingredients(${INGREDIENT_COLUMNS})`);

  if (error) throw error;

  return (
    data
      // ingredient_id är nullbar i schemat (fritext var tänkt från början),
      // men appen skapar bara varor med ingrediens.
      .flatMap((row) =>
        row.ingredients
          ? [
              {
                id: row.id,
                ingredient: row.ingredients,
                amountBase: row.amount_base,
              },
            ]
          : [],
      )
      .sort((a, b) =>
        a.ingredient.name.localeCompare(b.ingredient.name, "sv"),
      )
  );
}

// name och dimension skrivs med: generate_shopping_list läser dem direkt ur
// recurring_items. name är en ögonblicksbild av ingrediensens namn och skrivs
// om varje gång varan sparas.
export async function saveRecurringItem({
  id,
  homeId,
  ingredient,
  amountBase,
}: SaveRecurringItemInput) {
  const row = {
    home_id: homeId,
    ingredient_id: ingredient.id,
    name: ingredient.name,
    dimension: ingredient.dimension,
    amount_base: amountBase,
  };

  const { error } = id
    ? await supabase.from("recurring_items").update(row).eq("id", id)
    : await supabase.from("recurring_items").insert(row);

  if (error) throw error;
}

// Raden på innevarande veckas lista ligger kvar (FK:n är on delete set null):
// det man redan ska handla den här veckan ska inte försvinna.
export async function deleteRecurringItem(id: string) {
  const { error } = await supabase.from("recurring_items").delete().eq("id", id);
  if (error) throw error;
}

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
