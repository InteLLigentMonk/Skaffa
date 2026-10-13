import ModalScreen from "@/components/modal-screen";
import IngredientsPicker from "@/features/ingredients/components/ingredients-picker";
import { useIngredients } from "@/features/ingredients/hooks/use-ingredients";
import { PickerIngredient } from "@/features/ingredients/ingredient-types";
import { RecipeFormValues } from "@/features/recipes/recipe-types";
import { DEFAULT_UNIT } from "@/lib/units";
import { useRouter } from "expo-router";
import { Button, SkeletonGroup, Typography } from "heroui-native";
import { useFormContext, useWatch } from "react-hook-form";
import { View } from "react-native";

const ChooseIngredients = () => {
  const { data: ingredients, isPending, error, refetch } = useIngredients();

  const router = useRouter();
  const { control, getValues, setValue } = useFormContext<RecipeFormValues>();
  const selected = useWatch({ control, name: "ingredients" });
  const selectedIds = new Set(selected.map((row) => row.ingredientId));

  const onToggle = (ingredient: PickerIngredient) => {
    const current = getValues("ingredients");
    const isSelected = current.some(
      (row) => row.ingredientId === ingredient.id,
    );

    setValue(
      "ingredients",
      isSelected
        ? current.filter((row) => row.ingredientId !== ingredient.id)
        : [
            ...current,
            {
              ingredientId: ingredient.id,
              name: ingredient.name,
              homeId: ingredient.home_id,
              amount: "1",
              unit: DEFAULT_UNIT[ingredient.dimension],
              dimension: ingredient.dimension,
              density: ingredient.density_g_per_ml,
              dietTag: ingredient.diet_tag,
            },
          ],
      { shouldDirty: true, shouldValidate: true },
    );
  };

  if (isPending)
    return (
      <ModalScreen>
        <SkeletonGroup className="flex-1 gap-4">
          <SkeletonGroup.Item className="h-12 w-full rounded-lg" />
          <SkeletonGroup.Item className="h-12 w-full rounded-lg" />
        </SkeletonGroup>
      </ModalScreen>
    );
  if (error || !ingredients)
    return (
      <ModalScreen>
        <View className="flex-1 items-center justify-center gap-4 p-8">
          <Typography.Paragraph color="muted" align="center">
            Kunde inte hämta ingredienserna.
          </Typography.Paragraph>
          <Button variant="secondary" onPress={() => refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
          <Button variant="tertiary" onPress={() => router.back()}>
            <Button.Label>Tillbaka</Button.Label>
          </Button>
        </View>
      </ModalScreen>
    );
  return (
    <ModalScreen>
      <IngredientsPicker
        ingredients={ingredients}
        onToggle={onToggle}
        onBack={() => router.back()}
        onCreateNew={(name) => {
          router.push({
            pathname: "/recipe-form/new-ingredient",
            params: { name },
          });
        }}
        selectedIds={selectedIds}
        // Diskmedel och toapapper hör inte hemma i ett recept. De finns för
        // återkommande varor på inköpslistan.
        hiddenCategories={["household"]}
      />
    </ModalScreen>
  );
};

export default ChooseIngredients;
