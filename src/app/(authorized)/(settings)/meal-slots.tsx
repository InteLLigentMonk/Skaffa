import { useHome } from "@/features/home/hooks/use-home";
import {
  useSetVisibleSlots,
  useVisibleSlots,
} from "@/features/plan/hooks/use-plan";
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS,
  MealSlot,
} from "@/features/plan/plan-types";
import {
  Button,
  ControlField,
  FieldError,
  Label,
  ListGroup,
  Separator,
  Typography,
} from "heroui-native";
import { Fragment } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

const MealSlots = () => {
  const { data: home } = useHome();
  const visibleSlots = useVisibleSlots();
  const setSlots = useSetVisibleSlots();

  if (visibleSlots.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (visibleSlots.isError || !home) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Typography.Paragraph color="muted" align="center">
          Kunde inte läsa måltiderna.
        </Typography.Paragraph>
        <Button variant="tertiary" onPress={() => visibleSlots.refetch()}>
          <Button.Label>Försök igen</Button.Label>
        </Button>
      </View>
    );
  }

  // Medan en sparning pågår visas det valda läget direkt, i stället för att
  // switchen hoppar tillbaka tills servern svarat.
  const selected = setSlots.isPending
    ? setSlots.variables.slots
    : visibleSlots.data;

  const toggle = (slot: MealSlot, on: boolean) => {
    const next = on
      ? [...selected, slot]
      : selected.filter((s) => s !== slot);
    setSlots.mutate({ homeId: home.id, slots: next });
  };

  return (
    <ScrollView contentContainerClassName="grow gap-2 px-4 py-6">
      <Label>Måltider som planeras</Label>
      <Typography.Paragraph type="body-sm" color="muted">
        Gäller hela hemmet. Avstängda måltider visas inte som tomma fält i
        veckoplanen, men redan inplanerade recept ligger kvar.
      </Typography.Paragraph>

      <ListGroup className="mt-2">
        {MEAL_SLOTS.map((slot, i) => {
          const isOn = selected.includes(slot);
          // Minst en måltid måste finnas kvar, annars finns inget att planera i.
          const isLast = isOn && selected.length === 1;

          return (
            <Fragment key={slot}>
              {i > 0 && <Separator className="mx-4" />}
              <ControlField
                className="px-4 py-3"
                isSelected={isOn}
                isDisabled={setSlots.isPending || isLast}
                onSelectedChange={(on) => toggle(slot, on)}
              >
                <Label className="flex-1">{MEAL_SLOT_LABELS[slot]}</Label>
                <ControlField.Indicator />
              </ControlField>
            </Fragment>
          );
        })}
      </ListGroup>

      <FieldError isInvalid={!!setSlots.error}>
        Kunde inte spara. Försök igen.
      </FieldError>
    </ScrollView>
  );
};

export default MealSlots;
