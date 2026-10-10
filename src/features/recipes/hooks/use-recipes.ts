import { useHome } from "@/features/home/hooks/use-home";
import { planKeys } from "@/features/plan/hooks/use-plan";
import { PostgrestError } from "@supabase/supabase-js";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  copyPublicRecipe,
  deleteRecipe,
  duplicateRecipe,
  getRecipe,
  getRecipeForEdit,
  RECIPE_PAGE_SIZE,
  saveRecipe,
  SaveRecipeInput,
  searchRecipes,
  setRecipeFavorite,
} from "../api";
import {
  FAVORITE_TAG,
  RecipeDetail,
  RecipeFilters,
  RecipeScope,
} from "../recipe-types";

// list ligger under prefixet ["recipes"], så useSaveRecipe:s invalidering
// av recipeKeys.all når även rutnätet. Hemmets lista bär hem-id så cachen
// inte delas mellan konton på samma enhet; receptbanken är densamma för alla.
// detail bär scope: ett hemrecept och ett bankrecept är olika tabeller, och
// id:n får aldrig dela cachepost.
export const recipeKeys = {
  all: ["recipes"] as const,
  lists: ["recipes", "list"] as const,
  list: (scope: RecipeScope, filters: RecipeFilters, homeId?: string) =>
    ["recipes", "list", scope, homeId ?? null, filters] as const,
  detail: (scope: RecipeScope, id: string) =>
    ["recipes", "detail", scope, id] as const,
  form: (id: string) => ["recipes", "form", id] as const,
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

export const useRecipe = (scope: RecipeScope, id: string) =>
  useQuery({
    queryKey: recipeKeys.detail(scope, id),
    queryFn: () => getRecipe(scope, id),
  });

// Ingen cache mellan två öppningar av formuläret: useForm läser värdena en
// gång, så det som visas måste vara färskt just då — någon annan i hemmet kan
// ha ändrat receptet under de fem minuter som annars räknas som färska.
export const useRecipeForEdit = (id: string | undefined) =>
  useQuery({
    queryKey: recipeKeys.form(id ?? ""),
    queryFn: () => getRecipeForEdit(id!),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });

// recipeKeys.all når även detaljen, så en redigering av ett befintligt
// recept syns direkt på detaljsidan.
export const useSaveRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, SaveRecipeInput>({
    mutationFn: saveRecipe,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
  });
};

// Bara listorna och planen invalideras, inte detaljen: sidan som raderade
// receptet är fortfarande monterad under tillbaka-animationen, och en refetch
// av ett recept som inte finns hade blinkat fram felvyn.
export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, string>({
    mutationFn: deleteRecipe,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: recipeKeys.lists }),
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
      ]),
  });
};

export const useDuplicateRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, string>({
    mutationFn: duplicateRecipe,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists }),
  });
};

type FavoriteInput = { id: string; favorite: boolean };

// Optimistisk: hjärtat ska slå om direkt, inte efter en rundresa. Går
// skrivningen fel rullas cachen tillbaka.
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    PostgrestError,
    FavoriteInput,
    { previous?: RecipeDetail }
  >({
    mutationFn: ({ id, favorite }) => setRecipeFavorite(id, favorite),
    onMutate: async ({ id, favorite }) => {
      const key = recipeKeys.detail("home", id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<RecipeDetail>(key);

      if (previous) {
        const tags = previous.tags.filter((tag) => tag !== FAVORITE_TAG);
        queryClient.setQueryData<RecipeDetail>(key, {
          ...previous,
          tags: favorite ? [...tags, FAVORITE_TAG] : tags,
        });
      }
      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          recipeKeys.detail("home", id),
          context.previous,
        );
      }
    },
    // Listorna också: kortens meny läser favoritstatus därifrån.
    onSettled: (_data, _error, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: recipeKeys.detail("home", id),
        }),
        queryClient.invalidateQueries({ queryKey: recipeKeys.lists }),
      ]),
  });
};

// Hemmets kopia av ett bankrecept. copy_public_recipe återanvänder en
// befintlig kopia, så att spara samma recept två gånger ger ingen dubblett.
export const useCopyPublicRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, string>({
    mutationFn: copyPublicRecipe,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists }),
  });
};
