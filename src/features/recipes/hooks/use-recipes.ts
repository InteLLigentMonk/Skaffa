import { useHome } from "@/features/home/hooks/use-home";
import { PostgrestError } from "@supabase/supabase-js";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createRecipe,
  CreateRecipeInput,
  RECIPE_PAGE_SIZE,
  searchRecipes,
} from "../api";
import { RecipeFilters, RecipeScope } from "../recipe-types";

// list ligger under prefixet ["recipes"], så useCreateRecipe:s invalidering
// av recipeKeys.all når även rutnätet. Hemmets lista bär hem-id så cachen
// inte delas mellan konton på samma enhet; receptbanken är densamma för alla.
export const recipeKeys = {
  all: ["recipes"] as const,
  list: (scope: RecipeScope, filters: RecipeFilters, homeId?: string) =>
    ["recipes", "list", scope, homeId ?? null, filters] as const,
  detail: (id: string) => ["recipes", id] as const,
};

export const useRecipeSearch = (scope: RecipeScope, filters: RecipeFilters) => {
  const { data: home } = useHome();

  return useInfiniteQuery({
    queryKey: recipeKeys.list(
      scope,
      filters,
      scope === "home" ? home?.id : undefined,
    ),
    queryFn: ({ pageParam }) => searchRecipes(scope, filters, pageParam),
    initialPageParam: 0,
    // En sida som inte är full betyder att det inte finns mer.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < RECIPE_PAGE_SIZE
        ? undefined
        : allPages.length * RECIPE_PAGE_SIZE,
  });
};

export const useCreateRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, CreateRecipeInput>({
    mutationFn: createRecipe,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
  });
};
