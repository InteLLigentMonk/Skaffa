import { router } from "expo-router";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";

const index = () => {
  return (
    <View className="flex-1 items-center justify-center gap-6 p-safe-offset-8">
      <Typography.Heading type="h1" align="center" weight="bold">
        Recept
      </Typography.Heading>
      <Button
        feedbackVariant="scale-ripple"
        onPress={() => router.push("/new-recepie")}
      >
        <Button.Label>Nytt recept</Button.Label>
      </Button>
    </View>
  );
};

export default index;
