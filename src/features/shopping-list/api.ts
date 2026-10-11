import { IngredientCategory } from "@/features/ingredients/ingredient-types";
import { TablesInsert } from "@/lib/database.types";
import { IsoDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import {
  AddListItemInput,
  completeCategoryOrder,
  CostPoint,
  RecurringItem,
  SaveRecurringItemInput,
  ShoppingList,
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

/**
 * Bygger (eller bygger om) veckans inköpslista ur veckoplanen och hemmets
 * återkommande varor. Säker att köra flera gånger: avbockade rader förblir
 * avbockade och det som inte längre behövs markeras is_orphaned.
 */
export async function generateShoppingList(
  homeId: string,
  weekStart: IsoDate,
): Promise<string> {
  const { data, error } = await supabase.rpc("generate_shopping_list", {
    _home_id: homeId,
    _week_start: weekStart,
  });

  if (error) throw error;
  return data;
}

const ITEM_COLUMNS =
  "id, source, ingredient_id, name, amount, dimension, category, checked, is_orphaned";

/** Veckans lista med rader, eller null om ingen lista finns för veckan än. */
export async function getShoppingList(
  homeId: string,
  weekStart: IsoDate,
): Promise<ShoppingList | null> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(
      `id, week_start, total_cost, generated_at, plan_changed_at, shopping_list_items(${ITEM_COLUMNS})`,
    )
    .eq("home_id", homeId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    weekStart: data.week_start,
    totalCost: data.total_cost,
    generatedAt: data.generated_at,
    planChangedAt: data.plan_changed_at,
    items: data.shopping_list_items.map((row) => ({
      id: row.id,
      source: row.source,
      ingredientId: row.ingredient_id,
      name: row.name,
      amountBase: row.amount,
      dimension: row.dimension,
      category: row.category,
      checked: row.checked,
      isOrphaned: row.is_orphaned,
    })),
  };
}

// En manuell vara eller en kostnad kan komma före första genereringen, så
// listan skapas vid behov. ignoreDuplicates gör att en befintlig lista lämnas
// orörd (generated_at, total_cost) — och att upserten då inte returnerar
// någon rad, därav den separata läsningen.
async function ensureShoppingList(
  homeId: string,
  weekStart: IsoDate,
): Promise<string> {
  const { error: upsertError } = await supabase
    .from("shopping_lists")
    .upsert(
      { home_id: homeId, week_start: weekStart },
      { onConflict: "home_id,week_start", ignoreDuplicates: true },
    );
  if (upsertError) throw upsertError;

  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("home_id", homeId)
    .eq("week_start", weekStart)
    .single();

  if (error) throw error;
  return data.id;
}

export async function addListItem(input: AddListItemInput) {
  const listId = await ensureShoppingList(input.homeId, input.weekStart);

  // Fritext saknar ingrediens, och därmed kategori och måttslag: raden är
  // bara ett namn och hamnar under Övrigt.
  const row: TablesInsert<"shopping_list_items"> =
    input.kind === "ingredient"
      ? {
          list_id: listId,
          source: "manual",
          ingredient_id: input.ingredient.id,
          name: input.ingredient.name,
          amount: input.amountBase,
          dimension: input.ingredient.dimension,
          category: input.ingredient.category,
        }
      : { list_id: listId, source: "manual", name: input.name };

  const { error } = await supabase.from("shopping_list_items").insert(row);
  if (error) throw error;
}

export async function setItemChecked(id: string, checked: boolean) {
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteListItem(id: string) {
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** null tar bort beloppet; veckan räknas då inte med i snittet. */
export async function setTotalCost(
  homeId: string,
  weekStart: IsoDate,
  totalCost: number | null,
) {
  const listId = await ensureShoppingList(homeId, weekStart);

  // .select().single() av samma skäl som setCategoryOrder.
  const { error } = await supabase
    .from("shopping_lists")
    .update({ total_cost: totalCost })
    .eq("id", listId)
    .select("id")
    .single();

  if (error) throw error;
}

/** Alla veckor med ifyllt belopp, äldst först. */
export async function getCostHistory(homeId: string): Promise<CostPoint[]> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("week_start, total_cost")
    .eq("home_id", homeId)
    .not("total_cost", "is", null)
    .order("week_start");

  if (error) throw error;

  return data.flatMap((row) =>
    row.total_cost === null
      ? []
      : [{ weekStart: row.week_start, totalCost: row.total_cost }],
  );
}
