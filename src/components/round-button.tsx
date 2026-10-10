import { StyledIonicons } from "@/utils/helpers";
import { Button } from "heroui-native";

type Props = {
  icon: React.ComponentProps<typeof StyledIonicons>["name"];
  label: string;
  onPress: () => void;
  iconClassName?: string;
};

// Rund ikonknapp som ligger ovanpå en bild i full bredd.
const RoundButton = ({
  icon,
  label,
  onPress,
  iconClassName = "text-foreground",
}: Props) => (
  <Button
    variant="tertiary"
    isIconOnly
    onPress={onPress}
    accessibilityLabel={label}
    className="rounded-full bg-background"
  >
    <StyledIonicons name={icon} size={20} className={iconClassName} />
  </Button>
);

export default RoundButton;
