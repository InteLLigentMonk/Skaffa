import { resolveImageUrls } from "@/features/recipes/api";
import { IsoDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import {
  IsoWeekday,
  MealSlot,
  PlannedMeal,
  SaveStandingMealInput,
  sortSlots,
  StandingMeal,
} from "./plan-types";

// Båda gränserna inklusive. RLS (meals_all) begränsar till det egna hemmet.
// Bilderna löses upp i samma anrop, så veckoplanens kort inte behöver en egen
// fråga per recept. Samma recept flera dagar ger samma sökväg och en URL.
export async function getPlannedMeals(
  from: IsoDate,
  to: IsoDate,
): Promise<PlannedMeal[]> {
  const { data, error } = await supabase
    .from("planned_meals")
    .select(
      "id, meal_date, slot, servings, recipe_id, recipes(name, image_path, prep_minutes)",
    )
    .gte("meal_date", from)
    .lte("meal_date", to)
    .order("meal_date")
    .order("slot")
    .order("created_at");

  if (error) throw error;

  const paths = [
    ...new Set(data.flatMap((row) => row.recipes.image_path ?? [])),
  ];
  const imageUrls = await resolveImageUrls("home", paths);

  return data.map((row) => ({
    id: row.id,
    date: row.meal_date,
    slot: row.slot,
    servings: row.servings,
    recipeId: row.recipe_id,
    recipeName: row.recipes.name,
    prepMinutes: row.recipes.prep_minutes,
    imagePath: row.recipes.image_path,
    imageUrl: row.recipes.image_path
      ? (imageUrls.get(row.recipes.image_path) ?? null)
      : null,
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

// .select().single() därför att en update som RLS filtrerar bort inte är ett
// fel i PostgREST — den träffar bara noll rader. Utan den skulle ett tyst
// misslyckande se ut som en lyckad sparning.
export async function setVisibleSlots(
  homeId: string,
  slots: MealSlot[],
): Promise<MealSlot[]> {
  const { data, error } = await supabase
    .from("home_settings")
    .update({ visible_slots: sortSlots(slots) })
    .eq("home_id", homeId)
    .select("visible_slots")
    .single();

  if (error) throw error;
  return sortSlots(data.visible_slots);
}

/**
 * Sår stående måltider i veckorna mellan from och to, de som ingen öppnat än.
 * Billig no-op för redan sådda veckor (seeded_weeks).
 */
export async function seedStandingWeeks(from: IsoDate, to: IsoDate) {
  const { error } = await supabase.rpc("seed_standing_weeks", {
    _from: from,
    _to: to,
  });

  if (error) throw error;
}

export async function getStandingMeals(): Promise<StandingMeal[]> {
  const { data, error } = await supabase
    .from("standing_meals")
    .select("id, recipe_id, slot, weekdays, servings, recipes(name)")
    .order("slot")
    .order("created_at");

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    recipeName: row.recipes.name,
    slot: row.slot,
    // check-constrainten håller värdena inom 1–7.
    weekdays: row.weekdays as IsoWeekday[],
    servings: row.servings,
  }));
}

export async function saveStandingMeal(
  input: SaveStandingMealInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("save_standing_meal", {
    // RPC:n tar null för en ny regel; de genererade typerna känner inte till
    // att parametern är nullbar.
    _id: input.id as string,
    _recipe_id: input.recipeId,
    _slot: input.slot,
    _weekdays: input.weekdays,
    _servings: input.servings,
  });

  if (error) throw error;
  return data;
}

export async function deleteStandingMeal(id: string) {
  const { error } = await supabase.rpc("delete_standing_meal", { _id: id });
  if (error) throw error;
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

export type UpdatePlannedMealInput = PlanMealInput & {
  id: string;
};

// Portioner, byt recept och flytta går alla hit. RPC:n slår ihop raden med en
// likadan i målmåltiden i stället för att krocka med unique-constrainten.
export async function updatePlannedMeal(input: UpdatePlannedMealInput) {
  const { data, error } = await supabase.rpc("update_planned_meal", {
    _id: input.id,
    _recipe_id: input.recipeId,
    _date: input.date,
    _slot: input.slot,
    _servings: input.servings,
    _replace: input.replace,
  });

  if (error) throw error;
  return data;
}

// Direkt mot tabellen: RLS (meals_all) räcker, och det finns inget att hålla
// ihop. En borttagen instans av en stående måltid kommer inte tillbaka —
// veckan är redan sådd (seeded_weeks).
export async function deletePlannedMeal(id: string) {
  const { error } = await supabase.from("planned_meals").delete().eq("id", id);
  if (error) throw error;
}
