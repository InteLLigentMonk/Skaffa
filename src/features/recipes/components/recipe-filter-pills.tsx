import { Chip } from "heroui-native";
import { ScrollView } from "react-native";
import { DIET_LABELS, DietClass } from "../recipe-types";

const DIETS: DietClass[] = ["kott", "fisk", "vegetariskt"];

type Value = { quick: boolean; diet: DietClass | null };

type Props = Value & {
  onChange: (next: Value) => void;
};

// Snabblagat och kostklass är två oberoende dimensioner: snabblagat slås av
// och på för sig, och högst en kostklass kan vara vald. Ett tryck på en redan
// vald kostklass avmarkerar den. "Alla" nollställer båda.
const RecipeFilterPills = ({ quick, diet, onChange }: Props) => {
  const isAll = !quick && diet === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-2 px-4"
    >
      <Pill
        label="Alla"
        isSelected={isAll}
        onPress={() => onChange({ quick: false, diet: null })}
      />
      <Pill
        label="Snabblagat"
        isSelected={quick}
        onPress={() => onChange({ quick: !quick, diet })}
      />
      {DIETS.map((d) => (
        <Pill
          key={d}
          label={DIET_LABELS[d]}
          isSelected={diet === d}
          onPress={() => onChange({ quick, diet: diet === d ? null : d })}
        />
      ))}
    </ScrollView>
  );
};

const Pill = ({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <Chip
    onPress={onPress}
    accessibilityState={{ selected: isSelected }}
    size="lg"
    color={isSelected ? "accent" : "default"}
  >
    <Chip.Label>{label}</Chip.Label>
  </Chip>
);

export default RecipeFilterPills;
