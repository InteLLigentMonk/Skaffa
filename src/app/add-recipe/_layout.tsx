import { RecipeFormValues } from "@/features/recipes/recipe-types";
import { randomUUID } from "expo-crypto";
import { Stack, useGlobalSearchParams } from "expo-router";
import { FormProvider, useForm } from "react-hook-form";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const AddRecipeLayout = () => {
  // Recept-fliken skickar med söktermen ("Skapa ”Kycklinggryta”"). useForm
  // läser defaultValues bara vid mount, så senare param-ändringar när man
  // navigerar inne i modalen (choose-ingredients …) rör inte namnet — och
  // receptets id genereras en gång per öppnat formulär, inte per render.
  const { name } = useGlobalSearchParams<{ name?: string }>();
  const methods = useForm<RecipeFormValues>({
    defaultValues: {
      id: randomUUID(),
      servings: 1,
      name: name ?? "",
      prepMinutes: "",
      ingredients: [],
      steps: [],
      imagePath: null,
    },
  });

  return (
    // Modalen presenteras som en egen vy-hierarki på iOS, utanför rotens
    // GestureHandlerRootView. Utan en egen tar draghandtagen i stegen aldrig
    // emot gesten.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FormProvider {...methods}>
        <Stack
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="choose-ingredients" />
          <Stack.Screen name="new-ingredient" />
        </Stack>
      </FormProvider>
    </GestureHandlerRootView>
  );
};

export default AddRecipeLayout;
