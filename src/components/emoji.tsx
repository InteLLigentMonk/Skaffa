import { Text, View } from "react-native";

type Props = {
  children: React.ReactNode;
  size?: number;
  label?: string;
};

export const Emoji = ({ children, size = 20, label }: Props) => (
  <View
    style={{ width: size * 1.3, height: size * 1.3 }}
    className="items-center justify-center"
  >
    <Text
      style={{ fontSize: size, lineHeight: size * 1.3 }}
      accessibilityLabel={label}
      accessible={!!label}
    >
      {children}
    </Text>
  </View>
);
