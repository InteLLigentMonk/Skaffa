import { StyledIonicons } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { Menu } from "heroui-native";
import { ComponentProps } from "react";
import { View } from "react-native";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  variant?: "default" | "danger";
  isDisabled?: boolean;
  onPress?: () => void;
};

// En rad i receptens popover-menyer, så att de ser likadana ut överallt.
const RecipeMenuRow = ({
  icon,
  title,
  variant = "default",
  isDisabled,
  onPress,
}: Props) => (
  <Menu.Item variant={variant} isDisabled={isDisabled} onPress={onPress}>
    <View
      className={`flex flex-row items-center gap-3 ${isDisabled ? "opacity-40" : ""}`}
    >
      <StyledIonicons
        name={icon}
        size={20}
        className={variant === "danger" ? "text-danger" : "text-foreground"}
      />
      <Menu.ItemTitle>{title}</Menu.ItemTitle>
    </View>
  </Menu.Item>
);

export default RecipeMenuRow;
