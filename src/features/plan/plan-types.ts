import { Enums } from "@/lib/database.types";
import {
  addDays,
  fromIsoDate,
  IsoDate,
  today,
  toIsoDate,
  weekMonday,
} from "@/lib/dates";

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

/** Veckorna som går att planera i, som måndagar i ordning. */
export const planWeeks = (): IsoDate[] => {
  const current = weekMonday(today());
  return Array.from({ length: PLAN_WEEKS_AHEAD + 1 }, (_, i) =>
    addDays(current, i * 7),
  );
};

/**
 * Hela det planerbara intervallet, från denna veckas måndag till sista
 * veckans söndag. Veckoplanen och hemsidan frågar efter exakt det här, så de
 * delar samma fråga och cache.
 */
export const planRange = (): { from: IsoDate; to: IsoDate } => {
  const weeks = planWeeks();
  return { from: weeks[0], to: addDays(weeks[weeks.length - 1], 6) };
};

/**
 * Samma veckodag som `date`, fast i veckan som börjar `monday`. Hamnar den
 * före idag blir det idag — passerade dagar går inte att planera.
 */
export const sameWeekdayIn = (monday: IsoDate, date: IsoDate): IsoDate => {
  const offset = (fromIsoDate(date).getDay() + 6) % 7;
  const day = addDays(monday, offset);
  const now = today();
  return day < now ? now : day;
};

export type PlannedMeal = {
  id: string;
  date: IsoDate;
  slot: MealSlot;
  servings: number;
  recipeId: string;
  recipeName: string;
  /** Receptets tillagningstid; visas på hemsidans hero-kort. */
  prepMinutes: number | null;
  imagePath: string | null;
  imageUrl: string | null;
};

// Ungefär när varje måltid är över, i hel timme. Avgör vilken måltid
// hemsidan visar som "Härnäst": en måltid räknas som kommande tills dess.
const SLOT_ENDS_AT: Record<MealSlot, number> = {
  frukost: 10,
  brunch: 12,
  mellanmal_1: 11,
  lunch: 14,
  mellanmal_2: 16,
  middag: 21,
  snacks: 24,
};

/**
 * Dagens första måltid som inte är över än, annars morgondagens första.
 * meals ska vara sorterade på datum och måltid, som getPlannedMeals ger dem.
 */
export const nextMeal = (
  meals: PlannedMeal[],
  now = new Date(),
): { meal: PlannedMeal; isTomorrow: boolean } | null => {
  const day = toIsoDate(now);
  const upcoming = meals.find(
    (meal) => meal.date === day && SLOT_ENDS_AT[meal.slot] > now.getHours(),
  );
  if (upcoming) return { meal: upcoming, isTomorrow: false };

  const tomorrow = meals.find((meal) => meal.date === addDays(day, 1));
  return tomorrow ? { meal: tomorrow, isTomorrow: true } : null;
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
