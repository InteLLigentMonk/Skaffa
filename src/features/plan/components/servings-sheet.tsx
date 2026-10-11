import { useSheetOpen } from "@/hooks/use-sheet-open";
import NumberSelect from "@/components/number-select";
import { BottomSheet, Button, FieldError, Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useUpdatePlannedMeal } from "../hooks/use-plan";
import { PlannedMeal } from "../plan-types";

type Props = {
  meal: PlannedMeal;
  isOpen: boolean;
  onClose: () => void;
};

const ServingsSheet = ({ meal, isOpen, onClose }: Props) => {
  // Se use-sheet-open: arket monteras ofta redan öppet.
  const sheetOpen = useSheetOpen(isOpen);
  const update = useUpdatePlannedMeal();
  const [servings, setServings] = useState(meal.servings);

  const submit = () =>
    update.mutate(
      {
        id: meal.id,
        recipeId: meal.recipeId,
        date: meal.date,
        slot: meal.slot,
        servings,
        replace: false,
      },
      { onSuccess: onClose },
    );

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
              <BottomSheet.Title>Ändra portioner</BottomSheet.Title>
              <BottomSheet.Description>{meal.recipeName}</BottomSheet.Description>
            </View>

            <View className="flex-row items-center justify-between rounded-2xl bg-surface-secondary p-3">
              <View>
                <Typography.Paragraph weight="semibold">
                  Portioner
                </Typography.Paragraph>
                <Typography.Paragraph type="body-xs" color="muted">
                  Styr mängderna på inköpslistan
                </Typography.Paragraph>
              </View>
              <NumberSelect value={servings} onChange={setServings} />
            </View>

            <FieldError isInvalid={!!update.error}>
              {update.error?.code === "P0001"
                ? update.error.message
                : "Kunde inte spara portionerna"}
            </FieldError>

            <Button
              size="lg"
              isDisabled={servings === meal.servings || update.isPending}
              onPress={submit}
            >
              <Button.Label>{update.isPending ? "Sparar…" : "Spara"}</Button.Label>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

export default ServingsSheet;
