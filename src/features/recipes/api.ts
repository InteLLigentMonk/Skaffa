import { supabase } from "@/lib/supabase";
import { parseAmount } from "@/lib/units";
import {
  RecipeCardData,
  RecipeFilters,
  RecipeFormValues,
  RecipeIngredientRow,
  RecipeScope,
} from "./recipe-types";

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

export const RECIPE_PAGE_SIZE = 20;

// Bucketen recipes är privat, så bilderna kräver signerade URL:er. En vecka
// överlever en session med marginal; kortet cachar ändå på sökvägen, så en ny
// URL efter en refetch laddar inte ner bilden igen.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

type FacetRow = {
  id: string | null;
  name: string | null;
  image_path: string | null;
  prep_minutes: number | null;
  diet: RecipeCardData["diet"];
};

export async function searchRecipes(
  scope: RecipeScope,
  filters: RecipeFilters,
  offset: number,
): Promise<RecipeCardData[]> {
  const args = {
    _query: filters.query,
    _quick: filters.quick,
    _diet: filters.diet ?? undefined,
    _limit: RECIPE_PAGE_SIZE,
    _offset: offset,
  };

  const { data, error } =
    scope === "home"
      ? await supabase.rpc("search_home_recipes", args)
      : await supabase.rpc("search_public_recipes", args);

  if (error) throw error;

  // Vyernas kolumner är nullable i de genererade typerna (Postgres kan inte
  // bevisa not null genom en vy), men id och name är not null i tabellerna.
  const rows = (data as FacetRow[]).filter(
    (row): row is FacetRow & { id: string; name: string } =>
      row.id !== null && row.name !== null,
  );

  const imageUrls = await resolveImageUrls(
    scope,
    rows.flatMap((row) => (row.image_path ? [row.image_path] : [])),
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    imagePath: row.image_path,
    imageUrl: row.image_path ? (imageUrls.get(row.image_path) ?? null) : null,
    prepMinutes: row.prep_minutes,
    diet: row.diet,
  }));
}

// Ett anrop per sida i stället för ett per kort.
async function resolveImageUrls(
  scope: RecipeScope,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  if (scope === "explore") {
    // public_recipes är en publik bucket: URL:en byggs lokalt, inget nätverk.
    for (const path of paths) {
      const { data } = supabase.storage
        .from("public_recipes")
        .getPublicUrl(path);
      urls.set(path, data.publicUrl);
    }
    return urls;
  }

  const { data, error } = await supabase.storage
    .from("recipes")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  for (const entry of data) {
    // En enskild bild som saknas ska inte fälla hela sidan — kortet visar
    // platshållaren i stället.
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}
