import { IsoDate, weekdayLong } from "@/lib/dates";
import { Alert, Button } from "heroui-native";
import { View } from "react-native";
import { MEAL_SLOT_LABELS, MealSlot } from "../plan-types";

export type ConflictChoice = "add" | "replace";

type Props = {
  date: IsoDate;
  slot: MealSlot;
  /** Namnen på de andra recepten som redan ligger i måltiden. */
  otherNames: string[];
  choice: ConflictChoice | null;
  onChoiceChange: (choice: ConflictChoice) => void;
};

// Visas när måltiden man planerar i redan har något annat. Arket ska vara
// spärrat tills man valt: att tyst lägga till eller tyst ersätta är båda fel
// lika ofta.
const MealConflictAlert = ({
  date,
  slot,
  otherNames,
  choice,
  onChoiceChange,
}: Props) => {
  return (
    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content className="gap-3">
        <Alert.Description>
          {capitalize(weekdayLong(date))} {MEAL_SLOT_LABELS[slot].toLowerCase()}{" "}
          har redan {otherNames.join(", ")}. Vill du laga båda, eller byta ut?
        </Alert.Description>
        <View className="flex-row gap-2">
          <Button
            size="sm"
            className="flex-1"
            variant={choice === "add" ? "primary" : "outline"}
            onPress={() => onChoiceChange("add")}
          >
            <Button.Label>Lägg till</Button.Label>
          </Button>
          <Button
            size="sm"
            className="flex-1"
            variant={choice === "replace" ? "primary" : "outline"}
            onPress={() => onChoiceChange("replace")}
          >
            <Button.Label>Ersätt</Button.Label>
          </Button>
        </View>
      </Alert.Content>
    </Alert>
  );
};

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default MealConflictAlert;
