import { PlannedMeal } from "@/features/plan/plan-types";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { LinkButton, PressableFeedback, Surface } from "heroui-native";
import { Typography } from "heroui-native/text";
import { ScrollView, useWindowDimensions, View } from "react-native";
import MealCard from "./meal-card";

/** Dagens planerade måltider, sorterade i måltidsordning. */
const HomeMeals = ({ meals }: { meals: PlannedMeal[] }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 64) / 3;

  const openPlan = () => router.navigate("/(authorized)/(plan)");

  return (
    <View>
      <View className="flex flex-row justify-between items-center px-4">
        <Typography.Paragraph type="body" weight="bold">
          Idag
        </Typography.Paragraph>
        <LinkButton onPress={openPlan}>
          <LinkButton.Label className="light:text-green-700 dark:text-green-400">
            Hela veckan
            <StyledIonicons name="arrow-forward" size={16} />
          </LinkButton.Label>
        </LinkButton>
      </View>

      {meals.length === 0 ? (
        <View className="px-4 pb-4">
          <PressableFeedback onPress={openPlan}>
            <Surface className="flex-row items-center gap-3 rounded-2xl border-2 border-dashed p-4 light:border-green-600 light:bg-green-100 dark:border-green-400 dark:bg-green-950">
              <StyledIonicons
                name="calendar-outline"
                size={24}
                className="light:text-green-600 dark:text-green-400"
              />
              <View className="flex-1">
                <Typography.Paragraph
                  weight="bold"
                  className="light:text-green-700 dark:text-green-400"
                >
                  Inget planerat idag
                </Typography.Paragraph>
                <Typography.Paragraph type="body-sm" color="muted">
                  Lägg till måltider i veckoplanen
                </Typography.Paragraph>
              </View>
              <StyledIonicons
                name="chevron-forward"
                size={20}
                className="light:text-green-600 dark:text-green-400"
              />
            </Surface>
          </PressableFeedback>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16} // kortbredd + gap
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerClassName="pb-2 pt-1 gap-4 px-4"
        >
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              width={CARD_WIDTH}
              onPress={() =>
                router.push({
                  pathname: "/recipe/[id]",
                  params: { id: meal.recipeId, scope: "home" },
                })
              }
            />
          ))}
          <PressableFeedback
            className="flex items-center justify-center"
            style={{ width: CARD_WIDTH }}
            onPress={openPlan}
          >
            <Surface className="w-full grow rounded-xl border-2 border-dashed light:border-green-600 light:bg-green-100 dark:border-green-400 dark:bg-green-950 flex items-center justify-center">
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
      )}
    </View>
  );
};

export default HomeMeals;
