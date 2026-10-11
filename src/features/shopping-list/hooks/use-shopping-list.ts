import { useHome } from "@/features/home/hooks/use-home";
import { IngredientCategory } from "@/features/ingredients/ingredient-types";
import { PostgrestError } from "@supabase/supabase-js";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCategoryOrder, setCategoryOrder } from "../api";

// Hemmets, så nycklarna bär hem-id — samma skäl som i homeKeys.
export const shoppingListKeys = {
  all: ["shopping-list"] as const,
  categoryOrder: (homeId: string) =>
    ["shopping-list", homeId, "category-order"] as const,
};

export const useCategoryOrder = () => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: shoppingListKeys.categoryOrder(home?.id ?? ""),
    queryFn: home ? () => getCategoryOrder(home.id) : skipToken,
  });
};

// Optimistisk: en dragen rad ska stanna där den släpptes, inte hoppa tillbaka
// tills servern svarat. Går sparningen fel rullas ordningen tillbaka till
// läget före just den dragningen.
export const useSetCategoryOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    IngredientCategory[],
    PostgrestError,
    { homeId: string; order: IngredientCategory[] },
    { previous?: IngredientCategory[] }
  >({
    mutationFn: ({ homeId, order }) => setCategoryOrder(homeId, order),
    onMutate: async ({ homeId, order }) => {
      const key = shoppingListKeys.categoryOrder(homeId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<IngredientCategory[]>(key);
      queryClient.setQueryData(key, order);
      return { previous };
    },
    onError: (_error, { homeId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          shoppingListKeys.categoryOrder(homeId),
          context.previous,
        );
      }
    },
    // Ingen onSuccess som skriver serverns svar: drar man två gånger snabbt
    // hade det första svaret skrivit över den andra dragningens ordning.
  });
};
