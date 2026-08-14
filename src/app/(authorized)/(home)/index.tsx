import { useAuth } from "@/contexts/auth-context";
import { Typography } from "heroui-native";
import { View } from "react-native";

const index = () => {
  const auth = useAuth();

  return (
    <View className="flex-1 items-center justify-center gap-2 p-safe-offset-8">
      <Typography.Heading type="h1" align="center" weight="bold">
        Hej {auth.user?.name || "världen"}!
      </Typography.Heading>
    </View>
  );
};

export default index;
