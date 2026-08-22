import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { LinkButton, PressableFeedback, Surface } from "heroui-native";
import { Typography } from "heroui-native/text";
import { ScrollView, useWindowDimensions, View } from "react-native";
import MealCard from "./meal-card";

const mockData = [
  {
    imageSource: require("@/assets/images/korvstroganoff.jpg"),
    mealTime: "Frukost",
    meal: "2 ägg",
  },
  {
    imageSource: require("@/assets/images/korvstroganoff.jpg"),
    mealTime: "Lunch",
    meal: "Pasta Carbonara",
  },
  {
    imageSource: require("@/assets/images/korvstroganoff.jpg"),
    mealTime: "Mellanmål 2",
    meal: "Hallonsmoothie",
  },
  {
    imageSource: require("@/assets/images/korvstroganoff.jpg"),
    mealTime: "Middag",
    meal: "Korv stroganoff med ris",
  },
];

const HomeMeals = () => {
  const router = useRouter();

  const handleLinkPress = () => {
    router.replace("/(authorized)/(plan)");
  };

  const handleAddMeal = () => {
    router.push("/(authorized)/(plan)");
  };

  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 64) / 3;

  return (
    <View>
      <View className="flex flex-row justify-between items-center px-4">
        <Typography.Paragraph type="body" weight="bold">
          Idag
        </Typography.Paragraph>
        <LinkButton onPress={handleLinkPress}>
          <LinkButton.Label className="light:text-green-700 dark:text-green-400">
            Hela veckan
            <StyledIonicons name="arrow-forward" size={16} />
          </LinkButton.Label>
        </LinkButton>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16} // kortbredd + gap
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerClassName="pb-4 gap-4 px-4"
      >
        {mockData.map((meal, index) => (
          <MealCard
            key={index}
            imageSource={meal.imageSource}
            mealTime={meal.mealTime}
            meal={meal.meal}
          />
        ))}
        <PressableFeedback
          className="flex items-center justify-center"
          style={{ width: CARD_WIDTH }}
          onPress={handleAddMeal}
        >
          <Surface className="w-full grow rounded-2xl border-2 border-dashed light:border-green-600 light:bg-green-100 dark:border-green-400 dark:bg-green-950 flex items-center justify-center">
            <StyledIonicons
              name="add"
              size={24}
              className="dark:text-green-400 light:text-green-600"
            />
            <Typography.Paragraph
              type="body-sm"
              weight="bold"
              className="dark:text-green-400 light:text-green-600 text-center"
            >
              Lägg till
            </Typography.Paragraph>
          </Surface>
        </PressableFeedback>
      </ScrollView>
    </View>
  );
};

export default HomeMeals;
