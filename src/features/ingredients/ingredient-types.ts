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
// ingrediensen får mätas i den andra dimensionen (se unitsFor).
export type PickerIngredient = Pick<
  Ingredient,
  "id" | "home_id" | "name" | "category" | "dimension" | "density_g_per_ml"
>;

export type IngredientsPickerProps = {
  ingredients: PickerIngredient[];
  onBack: () => void;
  onToggle: (ingredient: PickerIngredient) => void;
  onCreateNew: (name: string) => void;
  selectedIds: Set<string>;
};
