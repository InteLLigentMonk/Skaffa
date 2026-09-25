import { StyledIonicons } from "@/utils/helpers";
import { PressableFeedback, Typography } from "heroui-native";
import { View } from "react-native";

type Props = {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

const NumberSelect = ({ value, onChange, min, max }: Props) => {
  return (
    <View className="flex-row items-center self-start bg-field rounded-xl border-2 border-field">
      <PressableFeedback
        onPress={() => onChange(Math.max(min || 1, value - 1))}
        className="p-4"
      >
        <StyledIonicons name="remove" size={24} className="text-muted" />
      </PressableFeedback>
      <View className="p-4 bg-background">
        <Typography.Heading type="h5" weight="bold">
          {value}
        </Typography.Heading>
      </View>
      <PressableFeedback
        onPress={() => onChange(Math.min(max || 20, value + 1))}
        className="p-4"
      >
        <StyledIonicons name="add" size={24} className="text-muted" />
      </PressableFeedback>
    </View>
  );
};

export default NumberSelect;
