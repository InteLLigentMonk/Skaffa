import { RecipeFormValues } from "@/features/recipes/recipe-types";
import { Stack } from "expo-router";
import { FormProvider, useForm } from "react-hook-form";

const AddRecipeLayout = () => {
  const methods = useForm<RecipeFormValues>({
    defaultValues: {
      servings: 1,
      name: "",
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
