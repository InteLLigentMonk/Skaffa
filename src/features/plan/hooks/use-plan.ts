import { useHome } from "@/features/home/hooks/use-home";
import { copyPublicRecipe } from "@/features/recipes/api";
import { RecipeScope } from "@/features/recipes/recipe-types";
import { IsoDate } from "@/lib/dates";
import { PostgrestError } from "@supabase/supabase-js";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteStandingMeal,
  getPlannedMeals,
  getStandingMeals,
  getVisibleSlots,
  planMeal,
  PlanMealInput,
  saveStandingMeal,
  seedStandingWeeks,
  setVisibleSlots,
} from "../api";
import { MealSlot, SaveStandingMealInput } from "../plan-types";

// Planen är hemmets, så nycklarna bär hem-id — samma skäl som i homeKeys.
// planKeys.all invaliderar alla intervall på en gång efter en skrivning.
export const planKeys = {
  all: ["plan"] as const,
  range: (homeId: string, from: IsoDate, to: IsoDate) =>
    ["plan", homeId, "range", from, to] as const,
  slots: (homeId: string) => ["plan", homeId, "slots"] as const,
  standing: (homeId: string) => ["plan", homeId, "standing"] as const,
};

// Sådden först: en vecka som öppnas för första gången ska visa sina stående
// måltider redan i samma läsning. För redan sådda veckor är den en no-op.
export const usePlannedMeals = (from: IsoDate, to: IsoDate) => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: planKeys.range(home?.id ?? "", from, to),
    queryFn: home
      ? async () => {
          await seedStandingWeeks(from, to);
          return getPlannedMeals(from, to);
        }
      : skipToken,
  });
};

export const useStandingMeals = () => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: planKeys.standing(home?.id ?? ""),
    queryFn: home ? getStandingMeals : skipToken,
  });
};

// planKeys.all: regeln ändrar både regellistan och de planerade måltiderna.
export const useSaveStandingMeal = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, SaveStandingMealInput>({
    mutationFn: saveStandingMeal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
};

export const useDeleteStandingMeal = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, string>({
    mutationFn: deleteStandingMeal,
    // Inte awaitad: skärmen går tillbaka direkt. Annars hinner den refetchade
    // listan sakna regeln och formuläret blinka "finns inte längre" först.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
};

export const useVisibleSlots = () => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: planKeys.slots(home?.id ?? ""),
    queryFn: home ? () => getVisibleSlots(home.id) : skipToken,
  });
};

export const useSetVisibleSlots = () => {
  const queryClient = useQueryClient();

  return useMutation<
    MealSlot[],
    PostgrestError,
    { homeId: string; slots: MealSlot[] }
  >({
    mutationFn: ({ homeId, slots }) => setVisibleSlots(homeId, slots),
    onSuccess: (slots, { homeId }) =>
      queryClient.setQueryData(planKeys.slots(homeId), slots),
  });
};

type PlanRecipeInput = PlanMealInput & {
  scope: RecipeScope;
};

// Ett bankrecept kopieras först till hemmet (planned_meals kan bara peka på
// hemmets recept). copy_public_recipe återanvänder en befintlig kopia, så
// att planera samma bankrecept igen skapar ingen dubblett. Två anrop utan
// gemensam transaktion: faller planeringen finns kopian kvar, vilket är
// ofarligt — den ligger bland hemmets recept och används nästa gång.
export const usePlanRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, PlanRecipeInput>({
    mutationFn: async ({ scope, recipeId, ...rest }) => {
      const homeRecipeId =
        scope === "explore" ? await copyPublicRecipe(recipeId) : recipeId;
      await planMeal({ ...rest, recipeId: homeRecipeId });
      return homeRecipeId;
    },
    onSuccess: (_id, { scope }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
        // En ny kopia ska synas i Hemmets recept. Nyckeln skrivs ut i stället
        // för recipeKeys.lists: use-recipes importerar planKeys härifrån, och
        // en cirkulär import av konstanter är odefinierad vid laddning.
        scope === "explore" &&
          queryClient.invalidateQueries({ queryKey: ["recipes", "list"] }),
      ]),
  });
};
