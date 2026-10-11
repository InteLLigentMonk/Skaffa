import { useSheetOpen } from "@/hooks/use-sheet-open";
import { BottomSheet, FieldError, Spinner, Typography } from "heroui-native";
import { View } from "react-native";
import { useUpdatePlannedMeal } from "../hooks/use-plan";
import { MEAL_SLOT_LABELS, PlannedMeal } from "../plan-types";
import RecipePicker from "./recipe-picker";

type Props = {
  meal: PlannedMeal;
  isOpen: boolean;
  onClose: () => void;
};

// Byter receptet men behåller dag, måltid och portioner — planerade man för
// fyra är det fortfarande fyra. Finns det nya receptet redan i måltiden slår
// update_planned_meal ihop raderna.
const SwapRecipeSheet = ({ meal, isOpen, onClose }: Props) => {
  // Se use-sheet-open: arket monteras ofta redan öppet.
  const sheetOpen = useSheetOpen(isOpen);
  const update = useUpdatePlannedMeal();

  const pick = (recipe: { id: string }) => {
    if (recipe.id === meal.recipeId) {
      onClose();
      return;
    }
    update.mutate(
      {
        id: meal.id,
        recipeId: recipe.id,
        date: meal.date,
        slot: meal.slot,
        servings: meal.servings,
        replace: false,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <BottomSheet
      isOpen={sheetOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-4">
            <View>
              <BottomSheet.Title>Byt recept</BottomSheet.Title>
              <BottomSheet.Description>
                {meal.recipeName} · {MEAL_SLOT_LABELS[meal.slot]} ·{" "}
                {meal.servings} portioner
              </BottomSheet.Description>
            </View>

            {update.isPending ? (
              <View className="items-center gap-2 py-8">
                <Spinner />
                <Typography.Paragraph color="muted">Byter…</Typography.Paragraph>
              </View>
            ) : (
              <RecipePicker onPick={pick} />
            )}

            <FieldError isInvalid={!!update.error}>
              {update.error?.code === "P0001"
                ? update.error.message
                : "Kunde inte byta recept"}
            </FieldError>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

export default SwapRecipeSheet;
