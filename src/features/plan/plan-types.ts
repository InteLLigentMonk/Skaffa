import { Enums } from "@/lib/database.types";
import { IsoDate, weekMonday } from "@/lib/dates";

export type MealSlot = Enums<"meal_slot">;

// Samma ordning som enumet meal_slot i databasen, som också är dess
// sorteringsordning. Allt som visar måltider sorterar efter den här listan.
export const MEAL_SLOTS: MealSlot[] = [
  "frukost",
  "brunch",
  "mellanmal_1",
  "lunch",
  "mellanmal_2",
  "middag",
  "snacks",
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  frukost: "Frukost",
  brunch: "Brunch",
  mellanmal_1: "Mellanmål",
  lunch: "Lunch",
  mellanmal_2: "Mellanmål 2",
  middag: "Middag",
  snacks: "Snacks",
};

export const sortSlots = (slots: MealSlot[]) =>
  [...slots].sort((a, b) => MEAL_SLOTS.indexOf(a) - MEAL_SLOTS.indexOf(b));

/** Innevarande vecka plus så här många framåt går att planera i. */
export const PLAN_WEEKS_AHEAD = 6;

export type PlannedMeal = {
  id: string;
  date: IsoDate;
  slot: MealSlot;
  servings: number;
  recipeId: string;
  recipeName: string;
};

/** ISO-veckodag som i standing_meals.weekdays: 1 = måndag … 7 = söndag. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: { day: IsoWeekday; short: string }[] = [
  { day: 1, short: "Mån" },
  { day: 2, short: "Tis" },
  { day: 3, short: "Ons" },
  { day: 4, short: "Tor" },
  { day: 5, short: "Fre" },
  { day: 6, short: "Lör" },
  { day: 7, short: "Sön" },
];

// Mönstren finns inte i databasen — där är allt bara en delmängd av 1–7.
export const WEEKDAY_PRESETS: { label: string; days: IsoWeekday[] }[] = [
  { label: "Varje dag", days: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Vardagar", days: [1, 2, 3, 4, 5] },
  { label: "Helger", days: [6, 7] },
];

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && a.every((d) => b.includes(d));

/** "Vardagar", eller "mån, ons, fre" när det inte är ett känt mönster. */
export const formatWeekdays = (days: number[]) => {
  const preset = WEEKDAY_PRESETS.find((p) => sameDays(p.days, days));
  if (preset) return preset.label;
  return WEEKDAYS.filter((w) => days.includes(w.day))
    .map((w) => w.short.toLowerCase())
    .join(", ");
};

export const matchesPreset = (days: number[], preset: IsoWeekday[]) =>
  sameDays(days, preset);

export type StandingMeal = {
  id: string;
  recipeId: string;
  recipeName: string;
  slot: MealSlot;
  weekdays: IsoWeekday[];
  servings: number;
};

export type SaveStandingMealInput = Omit<StandingMeal, "id" | "recipeName"> & {
  /** null = ny regel. */
  id: string | null;
};

export type GroupedMeals = {
  /** Vilka av de synliga måltiderna som har minst ett recept, per dag. */
  filledByDate: Record<IsoDate, Set<MealSlot>>;
  /** Antal ifyllda synliga måltider per vecka (nyckel = måndagen). */
  filledByWeek: Record<IsoDate, number>;
  /** Recepten i en måltid. Nyckel från mealKey(). */
  byMeal: Record<string, PlannedMeal[]>;
};

export const mealKey = (date: IsoDate, slot: MealSlot) => `${date}|${slot}`;

// En måltid räknas som ifylld oavsett hur många recept den har — tre rätter
// till middag är fortfarande en middag. Måltider som inte är synliga räknas
// inte, annars kunde en vecka bli mer än full.
export const groupMeals = (
  meals: PlannedMeal[],
  visibleSlots: MealSlot[],
): GroupedMeals => {
  const filledByDate: GroupedMeals["filledByDate"] = {};
  const filledByWeek: GroupedMeals["filledByWeek"] = {};
  const byMeal: GroupedMeals["byMeal"] = {};

  for (const meal of meals) {
    const key = mealKey(meal.date, meal.slot);
    (byMeal[key] ??= []).push(meal);

    if (!visibleSlots.includes(meal.slot)) continue;

    const filled = (filledByDate[meal.date] ??= new Set());
    if (!filled.has(meal.slot)) {
      filled.add(meal.slot);
      const monday = weekMonday(meal.date);
      filledByWeek[monday] = (filledByWeek[monday] ?? 0) + 1;
    }
  }

  return { filledByDate, filledByWeek, byMeal };
};
