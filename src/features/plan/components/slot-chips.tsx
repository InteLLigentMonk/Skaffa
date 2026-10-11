import { Chip } from "heroui-native";
import { View } from "react-native";
import { MEAL_SLOT_LABELS, MealSlot } from "../plan-types";

type Props = {
  /** Synliga måltider i kronologisk ordning. */
  slots: MealSlot[];
  value: MealSlot | null;
  onChange: (slot: MealSlot) => void;
  /** Måltider som redan har något planerat den valda dagen får en prick. */
  isTaken?: (slot: MealSlot) => boolean;
};

// Delas av arken som planerar en måltid, så "vilken måltid?" ser likadan ut
// överallt.
const SlotChips = ({ slots, value, onChange, isTaken }: Props) => {
  return (
    <View className="flex-row flex-wrap gap-2">
      {slots.map((s) => {
        const isSelected = s === value;

        return (
          <View key={s}>
            <Chip
              size="lg"
              variant={isSelected ? "soft" : "secondary"}
              color={isSelected ? "accent" : "default"}
              onPress={() => onChange(s)}
              accessibilityState={{ selected: isSelected }}
            >
              <Chip.Label>{MEAL_SLOT_LABELS[s]}</Chip.Label>
            </Chip>
            {isTaken?.(s) && (
              <View className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-secondary" />
            )}
          </View>
        );
      })}
    </View>
  );
};

export default SlotChips;
