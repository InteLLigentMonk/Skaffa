import { Enums, Tables } from "@/lib/database.types";
import { UnitDimension } from "@/lib/units";

export type IngredientCategory = Enums<"ingredient_category">;

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: "Grönsak",
  fruit: "Frukt",
  protein: "Protein",
  seafood: "Fisk & Skaldjur",
  snacks: "Snacks",
  dairy: "Mejeri",
  grains: "Torrvaror",
  spices: "Kryddor",
  bakery: "Bröd & Bakverk",
  frozen: "Fryst",
  beverages: "Dryck",
  household: "Hushåll",
  other: "Övrigt",
};

export const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  produce: "bg-cat-produce/30",
  fruit: "bg-cat-fruit/30",
  protein: "bg-cat-protein/30",
  seafood: "bg-cat-seafood/30",
  snacks: "bg-cat-snacks/30",
  dairy: "bg-cat-dairy/30",
  grains: "bg-cat-grains/30",
  spices: "bg-cat-spices/30",
  bakery: "bg-cat-bakery/30",
  frozen: "bg-cat-frozen/30",
  beverages: "bg-cat-beverages/30",
  household: "bg-cat-household/30",
  other: "bg-cat-other/30",
};

// Full färg för små markörer (prickarna i receptets ingredienslista). Skrivna
// ut i sin helhet: Uniwind hittar bara klassnamn som står som hela strängar.
export const CATEGORY_DOT_COLORS: Record<IngredientCategory, string> = {
  produce: "bg-cat-produce",
  fruit: "bg-cat-fruit",
  protein: "bg-cat-protein",
  seafood: "bg-cat-seafood",
  snacks: "bg-cat-snacks",
  dairy: "bg-cat-dairy",
  grains: "bg-cat-grains",
  spices: "bg-cat-spices",
  bakery: "bg-cat-bakery",
  frozen: "bg-cat-frozen",
  beverages: "bg-cat-beverages",
  household: "bg-cat-household",
  other: "bg-cat-other",
};

export const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  produce: "🥦",
  fruit: "🍎",
  protein: "🥩",
  seafood: "🐟",
  snacks: "🍪",
  dairy: "🥛",
  grains: "🌾",
  spices: "🌶️",
  bakery: "🍞",
  frozen: "❄️",
  beverages: "🥤",
  household: "🧹",
  other: "📦",
};

export type DietTagChoice = "kott" | "fisk" | "neutral";

export const DIET_TAG_LABELS: Record<DietTagChoice, string> = {
  kott: "Kött",
  fisk: "Fisk",
  neutral: "Varken",
};

export type NewIngredientValues = {
  name: string;
  // Måttslaget, inte måttet. Enheten väljer användaren per receptrad.
  dimension: UnitDimension | null;
  category: IngredientCategory | null;
  dietTag: DietTagChoice | null;
};

export type Ingredient = Tables<"ingredients">;

// density_g_per_ml följer med för att receptformuläret ska veta om
// ingrediensen får mätas i den andra dimensionen (se unitsFor). diet_tag
// följer med så att formulärets bildplatshållare kan visa samma kostklass som
// receptet får när det sparats (recipe_facets.diet).
export type PickerIngredient = Pick<
  Ingredient,
  | "id"
  | "home_id"
  | "name"
  | "category"
  | "dimension"
  | "density_g_per_ml"
  | "diet_tag"
>;

export type IngredientsPickerProps = {
  ingredients: PickerIngredient[];
  onBack: () => void;
  onToggle: (ingredient: PickerIngredient) => void;
  onCreateNew: (name: string) => void;
  selectedIds: Set<string>;
};
