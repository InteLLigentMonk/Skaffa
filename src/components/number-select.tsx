import { StyledIonicons } from "@/utils/helpers";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";

type Props = {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

// Ljus bakgrund + tunn border så väljaren syns mot både sidan och de grå
// ytorna (Surface secondary) den oftast ligger på.
const NumberSelect = ({ value, onChange, min = 1, max = 20 }: Props) => {
  return (
    <View className="flex-row items-center self-start rounded-2xl border border-border bg-background px-1">
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        isDisabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel="Minska"
      >
        <StyledIonicons name="remove" size={20} className="text-foreground" />
      </Button>
      <Typography.Heading
        type="h5"
        weight="bold"
        align="center"
        className="min-w-10"
      >
        {value}
      </Typography.Heading>
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        isDisabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        accessibilityLabel="Öka"
      >
        <StyledIonicons name="add" size={20} className="text-foreground" />
      </Button>
    </View>
  );
};

export default NumberSelect;
