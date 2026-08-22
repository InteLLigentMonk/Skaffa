import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { Typography } from "heroui-native/text";
import { View } from "react-native";

const HomeNeededIngredients = () => {
  const router = useRouter();
  const handleLinkPress = () => {
    router.replace("/(authorized)/(shopping-list)");
  };

  return (
    <PressableFeedback onPress={handleLinkPress}>
      <View className="flex flex-row items-center justify-between border-t light:border-orange-600 dark:border-orange-400 p-4 light:bg-orange-100 dark:bg-orange-950">
        <View>
          <Typography.Heading
            type="h5"
            weight="bold"
            className="dark:text-orange-400 light:text-orange-600"
          >
            6 varor kvar att handla
          </Typography.Heading>
          <Typography.Paragraph
            type="body-sm"
            className="dark:text-orange-400 light:text-orange-600"
          >
            av 18 den här veckan.
          </Typography.Paragraph>
        </View>
        <StyledIonicons
          name="chevron-forward"
          size={24}
          className="dark:text-orange-400 light:text-orange-600"
        />
      </View>
    </PressableFeedback>
  );
};

export default HomeNeededIngredients;
