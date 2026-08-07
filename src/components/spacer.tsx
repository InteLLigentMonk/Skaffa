import { View } from "react-native";

type SpacerProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
};

const Spacer = ({ size = "md" }: SpacerProps) => {
  const sizeStyles = {
    xs: { height: 4 },
    sm: { height: 8 },
    md: { height: 16 },
    lg: { height: 32 },
    xl: { height: 64 },
    xxl: { height: 128 },
  };

  return <View style={[sizeStyles[size], { width: "100%" }]} />;
};

export default Spacer;
