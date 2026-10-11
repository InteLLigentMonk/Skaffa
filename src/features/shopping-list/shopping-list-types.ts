import {
  CATEGORY_LABELS,
  IngredientCategory,
  PickerIngredient,
} from "@/features/ingredients/ingredient-types";
import { planWeeks } from "@/features/plan/plan-types";
import { Enums } from "@/lib/database.types";
import { addDays, IsoDate } from "@/lib/dates";
import { UnitDimension } from "@/lib/units";

// Samma som kolumndefaulten på home_settings.category_order i baseline: en
// ungefärlig väg genom en svensk matbutik.
export const DEFAULT_CATEGORY_ORDER: IngredientCategory[] = [
  "produce",
  "fruit",
  "bakery",
  "protein",
  "seafood",
  "dairy",
  "grains",
  "spices",
  "snacks",
  "beverages",
  "frozen",
  "household",
  "other",
];

/**
 * En vara som läggs på varje veckas inköpslista (recurring_items). Alltid
 * kopplad till en ingrediens, så den får kategori och sorteras i
 * butiksordningen. Mängden lagras i basenhet (g, ml eller st), precis som på
 * listan, och är valfri: utan mängd betyder raden bara "kom ihåg".
 */
export type RecurringItem = {
  id: string;
  ingredient: PickerIngredient;
  amountBase: number | null;
};

export type SaveRecurringItemInput = {
  /** null = ny vara. */
  id: string | null;
  homeId: string;
  ingredient: PickerIngredient;
  amountBase: number | null;
};

// Kommer en ny kategori till i enumet saknas den i hem som redan sparat en
// ordning. Den hamnar då sist i stället för att försvinna från listan.
export const completeCategoryOrder = (order: IngredientCategory[]) => {
  const all = Object.keys(CATEGORY_LABELS) as IngredientCategory[];
  return [...order, ...all.filter((c) => !order.includes(c))];
};

/** Förra veckan plus planens veckor: kostnaden fylls ofta i efteråt. */
export const listWeeks = (): IsoDate[] => {
  const weeks = planWeeks();
  return [addDays(weeks[0], -7), ...weeks];
};

export type ListItemSource = Enums<"list_item_source">;

export type ShoppingListItem = {
  id: string;
  source: ListItemSource;
  ingredientId: string | null;
  name: string;
  /** I basenhet (g, ml eller st). null för fritext och varor utan mängd. */
  amountBase: number | null;
  dimension: UnitDimension | null;
  /** null för fritextvaror; de sorteras under Övrigt. */
  category: IngredientCategory | null;
  checked: boolean;
  /** Genererad rad som planen inte längre kräver. */
  isOrphaned: boolean;
};

export type ShoppingList = {
  id: string;
  weekStart: IsoDate;
  totalCost: number | null;
  generatedAt: string | null;
  planChangedAt: string | null;
  items: ShoppingListItem[];
};

/** Veckoplanen har ändrats efter att listan senast genererades. */
export const isPlanChanged = (list: ShoppingList) =>
  !!list.generatedAt &&
  !!list.planChangedAt &&
  Date.parse(list.planChangedAt) > Date.parse(list.generatedAt);

/**
 * Något som ska handlas, till skillnad från en föräldralös rad som bara
 * ligger kvar. Räknaren ("12 kvar av 18") räknar bara de här.
 */
export const isNeeded = (item: ShoppingListItem) =>
  !item.isOrphaned || item.checked;

export type AddListItemInput =
  | {
      kind: "ingredient";
      homeId: string;
      weekStart: IsoDate;
      ingredient: PickerIngredient;
      amountBase: number | null;
    }
  | { kind: "free"; homeId: string; weekStart: IsoDate; name: string };

export type CostPoint = { weekStart: IsoDate; totalCost: number };

/** "1 240 kr" — hela kronor, mellanslag som tusentalsavgränsare. */
export const formatKr = (amount: number) =>
  `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kr`;

export type ItemGroup = {
  category: IngredientCategory;
  items: ShoppingListItem[];
};

// Kvar att handla först, sedan det som inte längre behövs, avbockat sist —
// så det man har kvar alltid står överst i sin kategori.
const rank = (item: ShoppingListItem) =>
  item.checked ? 2 : item.isOrphaned ? 1 : 0;

/** Raderna per kategori i hemmets butiksordning. Tomma kategorier utelämnas. */
export const groupItems = (
  items: ShoppingListItem[],
  order: IngredientCategory[],
): ItemGroup[] =>
  order.flatMap((category) => {
    const inCategory = items
      .filter((item) => (item.category ?? "other") === category)
      .sort(
        (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "sv"),
      );
    return inCategory.length > 0 ? [{ category, items: inCategory }] : [];
  });
