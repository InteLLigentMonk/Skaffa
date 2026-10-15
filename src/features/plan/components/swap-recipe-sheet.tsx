import { BottomSheet, FieldError, Spinner, Typography } from "heroui-native";
import { View } from "react-native";
import { useUpdatePlannedMeal } from "../hooks/use-plan";
import { MEAL_SLOT_LABELS, PlannedMeal } from "../plan-types";
import RecipePicker from "./recipe-picker";

type Props = {
  /** null tills en måltid valts. */
  meal: PlannedMeal | null;
  /** Ny för varje öppning, så formuläret monteras om. */
  formKey: number | null;
  isOpen: boolean;
  onClose: () => void;
};

// Byter receptet men behåller dag, måltid och portioner — planerade man för
// fyra är det fortfarande fyra. Finns det nya receptet redan i måltiden slår
// update_planned_meal ihop raderna. Arket är monterat hela tiden — se
// kommentaren om Sheet i veckoplanen.
const SwapRecipeSheet = ({ meal, formKey, isOpen, onClose }: Props) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          {meal && <SwapRecipeForm key={formKey} meal={meal} onDone={onClose} />}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

const SwapRecipeForm = ({
  meal,
  onDone,
}: {
  meal: PlannedMeal;
  onDone: () => void;
}) => {
  const update = useUpdatePlannedMeal();

  const pick = (recipe: { id: string }) => {
    if (recipe.id === meal.recipeId) {
      onDone();
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
      { onSuccess: onDone },
    );
  };

  return (
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
  );
};

export default SwapRecipeSheet;
