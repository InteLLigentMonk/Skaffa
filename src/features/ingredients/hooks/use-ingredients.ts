import { PostgrestError } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createIngredient,
  CreateIngredientInput,
  deleteIngredient,
  listIngredients,
  renameIngredient,
  setIngredientDensity,
} from "../api";
import { PickerIngredient } from "../ingredient-types";

export const ingredientKeys = {
  all: ["ingredients"] as const,
  detail: (id: string) => ["ingredients", id] as const,
};

export const useIngredients = () =>
  useQuery({
    queryKey: ingredientKeys.all,
    queryFn: listIngredients,
  });

export const useSetIngredientDensity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, density }: { id: string; density: number }) =>
      setIngredientDensity(id, density),
    onSuccess: (_data, { id, density }) => {
      queryClient.setQueryData<PickerIngredient[]>(ingredientKeys.all, (old) =>
        old?.map((ingredient) =>
          ingredient.id === id
            ? { ...ingredient, density_g_per_ml: density }
            : ingredient,
        ),
      );
    },
  });
};

export const useCreateIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation<PickerIngredient, PostgrestError, CreateIngredientInput>({
    mutationFn: createIngredient,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all }),
  });
};

// Namnet syns i recept, veckoplan och inköpslistor under nycklar som inte bär
// ingrediens-id. Ett namnbyte är sällsynt, så invalidera allt hellre än att
// räkna upp varje feature.
export const useRenameIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, { id: string; name: string }>({
    mutationFn: renameIngredient,
    onSuccess: () => queryClient.invalidateQueries(),
  });
};

export const useDeleteIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation<void, PostgrestError, string>({
    mutationFn: deleteIngredient,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all }),
  });
};
