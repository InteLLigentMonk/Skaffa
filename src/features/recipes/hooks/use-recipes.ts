import { PostgrestError } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRecipe, CreateRecipeInput } from "../api";

export const recipeKeys = {
  all: ["recipes"] as const,
  detail: (id: string) => ["recipes", id] as const,
};

// export const useRecipes = () =>
//   useQuery({
//     queryKey: recipesKeys.all,
//     queryFn: listRecipes,
//   });

export const useCreateRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation<string, PostgrestError, CreateRecipeInput>({
    mutationFn: createRecipe,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
  });
};
