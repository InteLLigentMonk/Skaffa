import { IsoDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { MealSlot, PlannedMeal, sortSlots } from "./plan-types";

// Båda gränserna inklusive. RLS (meals_all) begränsar till det egna hemmet.
export async function getPlannedMeals(
  from: IsoDate,
  to: IsoDate,
): Promise<PlannedMeal[]> {
  const { data, error } = await supabase
    .from("planned_meals")
    .select("id, meal_date, slot, servings, recipe_id, recipes(name)")
    .gte("meal_date", from)
    .lte("meal_date", to)
    .order("meal_date")
    .order("slot")
    .order("created_at");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    date: row.meal_date,
    slot: row.slot,
    servings: row.servings,
    recipeId: row.recipe_id,
    recipeName: row.recipes.name,
  }));
}

/** Måltiderna hemmet valt att visa, i kronologisk ordning. */
export async function getVisibleSlots(homeId: string): Promise<MealSlot[]> {
  const { data, error } = await supabase
    .from("home_settings")
    .select("visible_slots")
    .eq("home_id", homeId)
    .single();

  if (error) throw error;
  return sortSlots(data.visible_slots);
}

export type PlanMealInput = {
  recipeId: string;
  date: IsoDate;
  slot: MealSlot;
  servings: number;
  /** true = ta bort övriga recept i måltiden ("Ersätt"). */
  replace: boolean;
};

export async function planMeal(input: PlanMealInput) {
  const { data, error } = await supabase.rpc("plan_meal", {
    _recipe_id: input.recipeId,
    _date: input.date,
    _slot: input.slot,
    _servings: input.servings,
    _replace: input.replace,
  });

  if (error) throw error;
  return data;
}
