import { useHome } from "@/features/home/hooks/use-home";
import { IngredientCategory } from "@/features/ingredients/ingredient-types";
import { seedStandingWeeks } from "@/features/plan/api";
import { addDays, IsoDate } from "@/lib/dates";
import { PostgrestError } from "@supabase/supabase-js";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addListItem,
  deleteListItem,
  deleteRecurringItem,
  generateShoppingList,
  getCategoryOrder,
  getCostHistory,
  getRecurringItems,
  getShoppingList,
  saveRecurringItem,
  setCategoryOrder,
  setItemChecked,
  setTotalCost,
  updateManualItem,
} from "../api";
import {
  AddListItemInput,
  SaveRecurringItemInput,
  ShoppingList,
} from "../shopping-list-types";

// Hemmets, så nycklarna bär hem-id — samma skäl som i homeKeys.
export const shoppingListKeys = {
  all: ["shopping-list"] as const,
  categoryOrder: (homeId: string) =>
    ["shopping-list", homeId, "category-order"] as const,
  recurring: (homeId: string) =>
    ["shopping-list", homeId, "recurring"] as const,
  week: (homeId: string, weekStart: IsoDate) =>
    ["shopping-list", homeId, "week", weekStart] as const,
  costs: (homeId: string) => ["shopping-list", homeId, "costs"] as const,
};

/** Veckans lista; data är null när veckan inte har någon lista än. */
export const useShoppingList = (weekStart: IsoDate) => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: shoppingListKeys.week(home?.id ?? "", weekStart),
    queryFn: home ? () => getShoppingList(home.id, weekStart) : skipToken,
  });
};

export const useCostHistory = () => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: shoppingListKeys.costs(home?.id ?? ""),
    queryFn: home ? () => getCostHistory(home.id) : skipToken,
  });
};

type ToggleItemInput = {
  homeId: string;
  weekStart: IsoDate;
  id: string;
  checked: boolean;
};

const toggleKey = ["shopping-list", "toggle"] as const;

// Optimistisk: i butiken bockar man av snabbt, och en ruta som väntar på
// servern känns trasig. Listan hämtas om först när den sista avbockningen i
// en snabb följd är klar — annars kan ett tidigt svar skriva över en senare
// avbockning med serverns äldre läge, och rutan blinkar tillbaka.
export const useToggleItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    ToggleItemInput,
    { previous?: ShoppingList | null }
  >({
    mutationKey: toggleKey,
    mutationFn: ({ id, checked }) => setItemChecked(id, checked),
    onMutate: async ({ homeId, weekStart, id, checked }) => {
      const key = shoppingListKeys.week(homeId, weekStart);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingList | null>(key);
      queryClient.setQueryData<ShoppingList | null>(key, (list) =>
        list
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === id ? { ...item, checked } : item,
              ),
            }
          : list,
      );
      return { previous };
    },
    onError: (_error, { homeId, weekStart }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          shoppingListKeys.week(homeId, weekStart),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, { homeId, weekStart }) => {
      if (queryClient.isMutating({ mutationKey: toggleKey }) === 1) {
        return queryClient.invalidateQueries({
          queryKey: shoppingListKeys.week(homeId, weekStart),
        });
      }
    },
  });
};

export const useAddListItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, AddListItemInput>({
    mutationFn: addListItem,
    onSuccess: (_data, { homeId, weekStart }) =>
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.week(homeId, weekStart),
      }),
  });
};

export const useDeleteListItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    { homeId: string; weekStart: IsoDate; id: string }
  >({
    mutationFn: ({ id }) => deleteListItem(id),
    onSuccess: (_data, { homeId, weekStart }) =>
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.week(homeId, weekStart),
      }),
  });
};

export const useUpdateManualItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    {
      homeId: string;
      weekStart: IsoDate;
      patch: Parameters<typeof updateManualItem>[0];
    }
  >({
    mutationFn: ({ patch }) => updateManualItem(patch),
    onSuccess: (_data, { homeId, weekStart }) =>
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.week(homeId, weekStart),
      }),
  });
};

export const useSetTotalCost = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    { homeId: string; weekStart: IsoDate; totalCost: number | null }
  >({
    mutationFn: ({ homeId, weekStart, totalCost }) =>
      setTotalCost(homeId, weekStart, totalCost),
    onSuccess: (_data, { homeId, weekStart }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: shoppingListKeys.week(homeId, weekStart),
        }),
        queryClient.invalidateQueries({
          queryKey: shoppingListKeys.costs(homeId),
        }),
      ]),
  });
};

export const useRecurringItems = () => {
  const { data: home } = useHome();

  return useQuery({
    queryKey: shoppingListKeys.recurring(home?.id ?? ""),
    queryFn: home ? getRecurringItems : skipToken,
  });
};

export const useSaveRecurringItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, SaveRecurringItemInput>({
    mutationFn: saveRecurringItem,
    onSuccess: (_data, { homeId }) =>
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.recurring(homeId),
      }),
  });
};

export const useDeleteRecurringItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, { id: string; homeId: string }>({
    mutationFn: ({ id }) => deleteRecurringItem(id),
    // Inte awaitad, av samma skäl som useDeleteStandingMeal: skärmen går
    // tillbaka direkt i stället för att först visa "finns inte längre".
    onSuccess: (_data, { homeId }) => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.recurring(homeId),
      });
    },
  });
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

// Sådden först, som i usePlannedMeals: från Lista-fliken kan man generera en
// vecka som ingen öppnat i veckoplanen, och då saknas de stående måltiderna.
// No-op för redan sådda veckor.
export const useGenerateShoppingList = () => {
  const queryClient = useQueryClient();

  return useMutation<
    string,
    PostgrestError,
    { homeId: string; weekStart: IsoDate }
  >({
    mutationFn: async ({ homeId, weekStart }) => {
      await seedStandingWeeks(weekStart, addDays(weekStart, 6));
      return generateShoppingList(homeId, weekStart);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: shoppingListKeys.all }),
        // Sådden kan ha lagt till måltider. Nyckeln skrivs ut i stället för
        // planKeys.all: use-plan importerar härifrån, och en cirkulär import
        // av konstanter är odefinierad vid laddning.
        queryClient.invalidateQueries({ queryKey: ["plan"] }),
      ]),
  });
};
