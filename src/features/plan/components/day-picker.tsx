import {
  dayOfMonth,
  IsoDate,
  weekDays,
  weekdayShort,
} from "@/lib/dates";
import { PressableFeedback, Surface, Typography } from "heroui-native";
import { View } from "react-native";
import { MealSlot } from "../plan-types";
import DayFillBar from "./day-fill-bar";

type Props = {
  weekStart: IsoDate;
  value: IsoDate | null;
  onChange: (date: IsoDate) => void;
  /** Synliga måltider i kronologisk ordning. */
  slots: MealSlot[];
  filledByDate: Record<IsoDate, Set<MealSlot>>;
  highlightSlot?: MealSlot | null;
  isDateDisabled?: (date: IsoDate) => boolean;
};

// Kontrollerad och utan egen datahämtning, så planeringssidan kan använda
// den med sin egen fråga. Föräldern äger vald dag och vad som är planerat.
const DayPicker = ({
  weekStart,
  value,
  onChange,
  slots,
  filledByDate,
  highlightSlot,
  isDateDisabled,
}: Props) => {
  return (
    <View className="flex-row gap-1.5">
      {weekDays(weekStart).map((date) => {
        const isSelected = date === value;
        const isDisabled = isDateDisabled?.(date) ?? false;

        return (
          <PressableFeedback
            key={date}
            className="flex-1"
            isDisabled={isDisabled}
            onPress={() => onChange(date)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
          >
            <Surface
              variant={isSelected ? "transparent" : "secondary"}
              className={`items-center gap-1 rounded-xl px-1 py-2 ${
                isSelected ? "bg-accent" : ""
              } ${isDisabled ? "opacity-40" : ""}`}
            >
              <Typography.Paragraph
                type="body-xs"
                weight="semibold"
                className={`uppercase ${isSelected ? "text-accent-foreground" : "text-muted"}`}
              >
                {weekdayShort(date)}
              </Typography.Paragraph>
              <Typography.Heading
                type="h5"
                weight="bold"
                className={isSelected ? "text-accent-foreground" : undefined}
              >
                {dayOfMonth(date)}
              </Typography.Heading>
              <DayFillBar
                slots={slots}
                filled={filledByDate[date]}
                highlightSlot={highlightSlot}
                inverted={isSelected}
              />
            </Surface>
          </PressableFeedback>
        );
      })}
    </View>
  );
};

export default DayPicker;
