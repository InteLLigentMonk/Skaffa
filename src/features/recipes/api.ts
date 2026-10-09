import { supabase } from "@/lib/supabase";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { parseAmount } from "@/lib/units";
import {
  RecipeCardData,
  RecipeDetail,
  RecipeDetailIngredient,
  RecipeFilters,
  RecipeFormValues,
  RecipeIngredientRow,
  RecipeScope,
} from "./recipe-types";

export type SaveRecipeInput = Pick<
  RecipeFormValues,
  "id" | "name" | "servings" | "imagePath"
> & {
  prepMinutes: number | null;
  ingredients: RecipeIngredientRow[];
  // Redan trimmade och utan tomma; save_recipe filtrerar ändå en gång till.
  steps: string[];
};

export async function saveRecipe(recipe: SaveRecipeInput) {
  const { data, error } = await supabase.rpc("save_recipe", {
    _id: recipe.id,
    _name: recipe.name,
    _servings: recipe.servings,
    // De genererade typerna gör alla argument icke-null eftersom funktionen
    // saknar defaults, men båda kolumnerna är nullable och funktionen tar null.
    _prep_minutes: recipe.prepMinutes as number,
    _image_path: recipe.imagePath as string,
    _ingredients: recipe.ingredients.map((row) => ({
      ingredient_id: row.ingredientId,
      display_amount: parseAmount(row.amount),
      display_unit: row.unit,
    })),
    _steps: recipe.steps,
  });

  if (error) throw error;
  return data;
}

// Ny fil vid varje uppladdning: sökvägen är expo-images cachenyckel, så en
// ny bild får aldrig återanvända en gammal sökväg.
export const recipeImagePath = (homeId: string, recipeId: string) =>
  `${homeId}/${recipeId}/${randomUUID()}.jpg`;

export async function uploadRecipeImage(path: string, localUri: string) {
  // supabase-js tar inte en fil-URI, så filen läses till en ArrayBuffer här.
  // Inte via fetch(localUri): i Expo Go hittade fetch inte filen och svarade
  // med texten "File not found", som laddades upp som om den vore bilden.
  // File läser direkt från disk och kastar om filen saknas.
  const body = await new File(localUri).arrayBuffer();
  if (body.byteLength === 0) throw new Error("Bildfilen är tom");
  const { error } = await supabase.storage
    .from("recipes")
    .upload(path, body, { contentType: "image/jpeg" });

  if (error) throw error;
}

// Bara för filer som aldrig sparats på ett recept. En sparad bild städas av
// triggern queue_recipe_image_cleanup när image_path byts eller raden raderas.
export async function removeRecipeImages(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("recipes").remove(paths);
  if (error) throw error;
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

// Ingrediens- och stegraderna har samma form i båda scopen, bara tabellnamnen
// skiljer. Inbäddningen ger ingredients som ett objekt (FK:n pekar på en rad).
type DetailIngredientRow = {
  id: string;
  display_amount: number;
  display_unit: RecipeDetailIngredient["displayUnit"];
  ingredients: { name: string; category: RecipeDetailIngredient["category"] };
};

const mapIngredients = (rows: DetailIngredientRow[]) =>
  rows
    .map((row) => ({
      id: row.id,
      name: row.ingredients.name,
      category: row.ingredients.category,
      displayAmount: row.display_amount,
      displayUnit: row.display_unit,
    }))
    // Raderna har ingen egen ordning; namnordning är åtminstone stabil mellan
    // refetchar.
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

export async function getRecipe(
  scope: RecipeScope,
  id: string,
): Promise<RecipeDetail> {
  if (scope === "home") {
    const [recipe, facets] = await Promise.all([
      supabase
        .from("recipes")
        .select(
          `id, name, servings, prep_minutes, image_path, tags,
           recipe_ingredients(id, display_amount, display_unit, ingredients(name, category)),
           recipe_steps(position, content)`,
        )
        .eq("id", id)
        .order("position", { referencedTable: "recipe_steps" })
        .single(),
      supabase.from("recipe_facets").select("diet").eq("id", id).maybeSingle(),
    ]);

    if (recipe.error) throw recipe.error;
    if (facets.error) throw facets.error;

    const { data } = recipe;
    const imageUrls = await resolveImageUrls(
      scope,
      data.image_path ? [data.image_path] : [],
    );

    return {
      id: data.id,
      scope,
      name: data.name,
      servings: data.servings,
      prepMinutes: data.prep_minutes,
      diet: facets.data?.diet ?? null,
      tags: data.tags,
      imagePath: data.image_path,
      imageUrl: data.image_path
        ? (imageUrls.get(data.image_path) ?? null)
        : null,
      ingredients: mapIngredients(data.recipe_ingredients),
      steps: data.recipe_steps,
    };
  }

  const [recipe, facets] = await Promise.all([
    supabase
      .from("public_recipes")
      .select(
        `id, name, servings, prep_minutes, image_path,
         public_recipe_ingredients(id, display_amount, display_unit, ingredients(name, category)),
         public_recipe_steps(position, content)`,
      )
      .eq("id", id)
      .order("position", { referencedTable: "public_recipe_steps" })
      .single(),
    supabase
      .from("public_recipe_facets")
      .select("diet")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (recipe.error) throw recipe.error;
  if (facets.error) throw facets.error;

  const { data } = recipe;
  const imageUrls = await resolveImageUrls(scope, [data.image_path]);

  return {
    id: data.id,
    scope,
    name: data.name,
    servings: data.servings,
    prepMinutes: data.prep_minutes,
    diet: facets.data?.diet ?? null,
    tags: [],
    imagePath: data.image_path,
    imageUrl: imageUrls.get(data.image_path) ?? null,
    ingredients: mapIngredients(data.public_recipe_ingredients),
    steps: data.public_recipe_steps,
  };
}

// Bilden städas av triggern queue_recipe_image_cleanup, och planerade
// måltider med receptet försvinner via on delete cascade.
export async function deleteRecipe(id: string) {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateRecipe(id: string) {
  const { data, error } = await supabase.rpc("duplicate_recipe", {
    _recipe_id: id,
  });
  if (error) throw error;
  return data;
}

/** Hemmets kopia av ett bankrecept. Skapas bara första gången. */
export async function copyPublicRecipe(publicId: string) {
  const { data, error } = await supabase.rpc("copy_public_recipe", {
    _public_id: publicId,
  });
  if (error) throw error;
  return data;
}

export async function setRecipeFavorite(id: string, favorite: boolean) {
  const { error } = await supabase.rpc("set_recipe_favorite", {
    _recipe_id: id,
    _favorite: favorite,
  });
  if (error) throw error;
}
