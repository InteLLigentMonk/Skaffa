import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

type Variant = "primary" | "filled" | "outlined" | "text";

type ThemedButtonProps = Omit<PressableProps, "style"> & {
  title: string;
  variant?: Variant;
  style?: ViewStyle;
};

const ThemedButton = ({
  title,
  variant = "primary",
  style,
  disabled,
  ...props
}: ThemedButtonProps) => {
  const theme = useTheme();

  const variantStyle: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: Colors.primary },
    filled: { backgroundColor: theme.surface },
    outlined: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.border,
    },
    text: { backgroundColor: "transparent" },
  };

  const textColor: Record<Variant, string> = {
    primary: Colors.onPrimary,
    filled: theme.text,
    outlined: theme.text,
    text: Colors.primary,
  };

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.text, { color: textColor[variant] }]}>
        {title}
      </Text>
    </Pressable>
  );
};

export default ThemedButton;

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
