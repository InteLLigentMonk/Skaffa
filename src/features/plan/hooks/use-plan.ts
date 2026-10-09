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
import { getPlannedMeals, getVisibleSlots, planMeal, PlanMealInput } from "../api";

// Planen är hemmets, så nycklarna bär hem-id — samma skäl som i homeKeys.
// planKeys.all invaliderar alla intervall på en gång efter en skrivning.
export const planKeys = {
  all: ["plan"] as const,
  range: (homeId: string, from: IsoDate, to: IsoDate) =>
    ["plan", homeId, "range", from, to] as const,
  slots: (homeId: string) => ["plan", homeId, "slots"] as const,
};

export const usePlannedMeals = (from: IsoDate, to: IsoDate) => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: planKeys.range(home?.id ?? "", from, to),
    queryFn: home ? () => getPlannedMeals(from, to) : skipToken,
  });
};

export const useVisibleSlots = () => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: planKeys.slots(home?.id ?? ""),
    queryFn: home ? () => getVisibleSlots(home.id) : skipToken,
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
