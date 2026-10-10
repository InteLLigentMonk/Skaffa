import ModalScreen from "@/components/modal-screen";
import IngredientsPicker from "@/features/ingredients/components/ingredients-picker";
import { useIngredients } from "@/features/ingredients/hooks/use-ingredients";
import { PickerIngredient } from "@/features/ingredients/ingredient-types";
import { RecipeFormValues } from "@/features/recipes/recipe-types";
import { DEFAULT_UNIT } from "@/lib/units";
import { useRouter } from "expo-router";
import { SkeletonGroup, Typography } from "heroui-native";
import { useFormContext, useWatch } from "react-hook-form";

const ChooseIngredients = () => {
  const { data: ingredients, isPending, error } = useIngredients();

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
  if (error)
    return (
      <ModalScreen>
        <Typography.Paragraph>Error: {error.message}</Typography.Paragraph>
      </ModalScreen>
    );
  if (!ingredients)
    return (
      <ModalScreen>
        <Typography.Paragraph>No ingredients found</Typography.Paragraph>
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
      />
    </ModalScreen>
  );
};

export default ChooseIngredients;
