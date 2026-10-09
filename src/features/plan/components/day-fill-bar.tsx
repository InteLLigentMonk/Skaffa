import { View } from "react-native";
import { MealSlot } from "../plan-types";

type Props = {
  /** Synliga måltider i kronologisk ordning — ett segment var. */
  slots: MealSlot[];
  filled?: Set<MealSlot>;
  /** Färgas i secondary, så man ser var just den måltiden redan är tagen. */
  highlightSlot?: MealSlot | null;
  /** På en vald (grön) ruta behövs ljusa segment för att synas. */
  inverted?: boolean;
};

// Stapeln har alltid samma bredd: fler måltider ger smalare segment, inte en
// bredare rad. Det är därför den håller för sju måltider där prickar inte gör
// det.
const DayFillBar = ({ slots, filled, highlightSlot, inverted }: Props) => {
  return (
    <View className="h-1 w-full flex-row gap-0.5">
      {slots.map((slot) => {
        const isFilled = filled?.has(slot) ?? false;
        const isHighlighted = slot === highlightSlot;

        let color: string;
        if (isFilled && isHighlighted) color = "bg-secondary";
        else if (isFilled) color = inverted ? "bg-accent-foreground" : "bg-accent";
        else color = inverted ? "bg-accent-foreground/30" : "bg-default";

        return <View key={slot} className={`flex-1 rounded-full ${color}`} />;
      })}
    </View>
  );
};

export default DayFillBar;
