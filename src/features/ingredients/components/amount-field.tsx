import { UNIT_LABELS, UnitCode } from "@/lib/units";
import {
  Chip,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { View } from "react-native";

type Props = {
  value: string;
  onChange: (text: string) => void;
  /** Enheterna ingrediensen kan anges i (unitsFor). */
  units: UnitCode[];
  unit: UnitCode | null;
  onUnitChange: (unit: UnitCode) => void;
  isInvalid: boolean;
  hint?: string;
};

// Valfri mängd med enhetschips. Fältet är valfritt: tomt betyder "ingen
// mängd", och föräldern avgör vad det innebär.
const AmountField = ({
  value,
  onChange,
  units,
  unit,
  onUnitChange,
  isInvalid,
  hint,
}: Props) => {
  // I ett ark lyfter arket sig över tangentbordet; annars no-ops.
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <View className="gap-2">
      <Label>Mängd (valfri)</Label>
      <TextField isInvalid={isInvalid}>
        <Input
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="Ingen mängd"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <FieldError>Ange ett tal större än noll</FieldError>
      </TextField>
      {units.length > 1 && (
        <View className="flex-row flex-wrap gap-2">
          {units.map((u) => {
            const isSelected = u === unit;
            return (
              <Chip
                key={u}
                variant={isSelected ? "soft" : "secondary"}
                color={isSelected ? "accent" : "default"}
                onPress={() => onUnitChange(u)}
                accessibilityState={{ selected: isSelected }}
              >
                <Chip.Label>{UNIT_LABELS[u]}</Chip.Label>
              </Chip>
            );
          })}
        </View>
      )}
      {hint && (
        <Typography.Paragraph type="body-xs" color="muted">
          {hint}
        </Typography.Paragraph>
      )}
    </View>
  );
};

export default AmountField;
