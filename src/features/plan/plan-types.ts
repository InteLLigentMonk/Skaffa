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
