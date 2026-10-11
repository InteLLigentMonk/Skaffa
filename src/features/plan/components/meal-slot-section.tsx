import DashedButton from "@/components/dashed-button";
import { StyledIonicons } from "@/utils/helpers";
import { Typography } from "heroui-native";
import { View } from "react-native";
import { MEAL_SLOT_LABELS, MealSlot, PlannedMeal } from "../plan-types";
import PlannedMealCard, { PlannedMealAction } from "./planned-meal-card";

type Props = {
  slot: MealSlot;
  meals: PlannedMeal[];
  /** false för passerade dagar: inget tomt fält och ingen meny på korten. */
  isEditable: boolean;
  onAdd: () => void;
  onOpenRecipe: (meal: PlannedMeal) => void;
  onAction: (meal: PlannedMeal, action: PlannedMealAction) => void;
  deletingId?: string;
};

const MealSlotSection = ({
  slot,
  meals,
  isEditable,
  onAdd,
  onOpenRecipe,
  onAction,
  deletingId,
}: Props) => {
  return (
    <View className="gap-2">
      <Typography.Paragraph
        type="body-xs"
        weight="bold"
        color="muted"
        className="uppercase tracking-wider"
      >
        {MEAL_SLOT_LABELS[slot]}
      </Typography.Paragraph>

      {meals.length > 0 ? (
        meals.map((meal) => (
          <PlannedMealCard
            key={meal.id}
            meal={meal}
            onPress={() => onOpenRecipe(meal)}
            onAction={
              isEditable ? (action) => onAction(meal, action) : undefined
            }
            isDeleting={meal.id === deletingId}
          />
        ))
      ) : isEditable ? (
        <DashedButton
          onPress={onAdd}
          color="green"
          className="flex flex-row items-center justify-center gap-2"
        >
          <StyledIonicons name="add-outline" size={20} className="text-accent" />
          <Typography.Paragraph weight="bold" className="text-accent">
            Lägg till måltid
          </Typography.Paragraph>
        </DashedButton>
      ) : (
        <Typography.Paragraph type="body-sm" color="muted">
          Inget planerat
        </Typography.Paragraph>
      )}
    </View>
  );
};

export default MealSlotSection;
