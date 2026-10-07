import { RecipeFormValues } from "@/features/recipes/recipe-types";
import { Stack, useGlobalSearchParams } from "expo-router";
import { FormProvider, useForm } from "react-hook-form";

const AddRecipeLayout = () => {
  // Recept-fliken skickar med söktermen ("Skapa ”Kycklinggryta”"). useForm
  // läser defaultValues bara vid mount, så senare param-ändringar när man
  // navigerar inne i modalen (choose-ingredients …) rör inte namnet.
  const { name } = useGlobalSearchParams<{ name?: string }>();
  const methods = useForm<RecipeFormValues>({
    defaultValues: {
      servings: 1,
      name: name ?? "",
      ingredients: [],
    },
  });

  return (
    <FormProvider {...methods}>
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="choose-ingredients" />
        <Stack.Screen name="new-ingredient" />
      </Stack>
    </FormProvider>
  );
};

export default AddRecipeLayout;
