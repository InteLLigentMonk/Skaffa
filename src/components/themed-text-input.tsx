import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

type Variant = "default" | "active" | "error";

type ThemedTextInputProps = TextInputProps & {
  variant?: Variant;
  style?: object;
};

const ThemedTextInput = ({
  variant = "default",
  style,
  onFocus,
  onBlur,
  ...props
}: ThemedTextInputProps) => {
  const theme = useTheme();

  const [focused, setFocused] = useState(false);

  const active = focused || variant === "active";
  const borderColor =
    variant === "error" ? Colors.error : active ? Colors.primary : theme.border;

  return (
    <TextInput
      {...props}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          color: theme.text,
          borderWidth: 1,
          borderColor,
          backgroundColor: theme.surface,
        },
        styles.input,
        style,
      ]}
      placeholderTextColor={theme.textSecondary}
    />
  );
};

export default ThemedTextInput;

const styles = StyleSheet.create({
  input: {
    width: "80%",
    fontSize: 16,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 10,
  },
});
