import { Typography } from "heroui-native";
import { View } from "react-native";

const CreateHome = () => {
  return (
    <View className="flex-1 gap-4 p-8">
      <Typography.Heading type="h2" weight="semibold">
        Skapa ett nytt hem
      </Typography.Heading>
    </View>
  );
};

export default CreateHome;
