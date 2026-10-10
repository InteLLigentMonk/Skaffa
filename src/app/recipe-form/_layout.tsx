import { RecipeFormModeProvider } from "@/features/recipes/contexts/recipe-form-context";
import { useRecipeForEdit } from "@/features/recipes/hooks/use-recipes";
import { RecipeFormValues } from "@/features/recipes/recipe-types";
import { randomUUID } from "expo-crypto";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { Button, Spinner, Typography } from "heroui-native";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Samma formulär för nytt och befintligt recept. Med ?id= redigeras det
// receptet, utan skapas ett nytt.
const RecipeFormLayout = () => {
  const router = useRouter();
  const params = useGlobalSearchParams<{ id?: string; name?: string }>();
  // Läses bara vid mount. De globala parametrarna följer den skärm som visas,
  // så inne i choose-ingredients finns inget id och new-ingredient har ett
  // eget name. Hade layouten läst dem varje render hade formuläret bytt läge
  // mitt i redigeringen.
  const [{ id, name }] = useState(params);

  const draft = useRecipeForEdit(id);

  if (!id) {
    return (
      <RecipeFormNavigator
        isEditing={false}
        initialImageUrl={null}
        defaultValues={{
          id: randomUUID(),
          servings: 1,
          // Recept-fliken skickar med söktermen ("Skapa ”Kycklinggryta”").
          name: name ?? "",
          prepMinutes: "",
          ingredients: [],
          steps: [],
          imagePath: null,
        }}
      />
    );
  }

  if (draft.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner size="lg" />
      </View>
    );
  }

  if (draft.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <Typography.Paragraph align="center" color="muted">
          Kunde inte hämta receptet
        </Typography.Paragraph>
        <View className="flex-row gap-2">
          <Button variant="tertiary" onPress={() => router.back()}>
            <Button.Label>Tillbaka</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => draft.refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <RecipeFormNavigator
      isEditing
      initialImageUrl={draft.data.imageUrl}
      defaultValues={draft.data.values}
    />
  );
};

type NavigatorProps = {
  isEditing: boolean;
  initialImageUrl: string | null;
  defaultValues: RecipeFormValues;
};

// Egen komponent så att useForm monteras först när värdena finns: den läser
// defaultValues bara vid mount. Av samma skäl rör en refetch av receptet
// (save invaliderar recipeKeys.all) inte ett formulär som redan är öppet.
const RecipeFormNavigator = ({
  isEditing,
  initialImageUrl,
  defaultValues,
}: NavigatorProps) => {
  const methods = useForm<RecipeFormValues>({ defaultValues });

  return (
    // Modalen presenteras som en egen vy-hierarki på iOS, utanför rotens
    // GestureHandlerRootView. Utan en egen tar draghandtagen i stegen aldrig
    // emot gesten.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RecipeFormModeProvider value={{ isEditing, initialImageUrl }}>
        <FormProvider {...methods}>
          <Stack
            screenOptions={{ headerShown: false, animation: "slide_from_right" }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="choose-ingredients" />
            <Stack.Screen name="new-ingredient" />
          </Stack>
        </FormProvider>
      </RecipeFormModeProvider>
    </GestureHandlerRootView>
  );
};

export default RecipeFormLayout;
