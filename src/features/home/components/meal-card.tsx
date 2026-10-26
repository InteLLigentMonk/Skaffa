import { Emoji } from "@/components/emoji";
import { MEAL_SLOT_LABELS, PlannedMeal } from "@/features/plan/plan-types";
import { Image } from "expo-image";
import { Card, PressableFeedback, Typography } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const StyledImage = withUniwind(Image);

const MealCard = ({
  meal,
  width,
  onPress,
}: {
  meal: PlannedMeal;
  width: number;
  onPress: () => void;
}) => {
  return (
    <PressableFeedback
      onPress={onPress}
      className="overflow-visible"
      style={{ width }}
    >
      <Card className="items-center gap-1 p-2 rounded-xl grow">
        {meal.imageUrl ? (
          <StyledImage
            // cacheKey på sökvägen, som receptkortet: en ny signerad URL ska
            // träffa cachen.
            source={{
              uri: meal.imageUrl,
              cacheKey: meal.imagePath ?? undefined,
            }}
            className="aspect-square w-full rounded-lg"
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="aspect-square w-full items-center justify-center rounded-lg bg-secondary-soft">
            <Emoji size={32}>🍽️</Emoji>
          </View>
        )}
        <Card.Body className="items-center gap-1">
          <Card.Title>
            <Typography type="body-sm" color="muted" weight="bold">
              {MEAL_SLOT_LABELS[meal.slot]}
            </Typography>
          </Card.Title>
          <Card.Description numberOfLines={2}>
            <Typography.Heading type="h6" className="text-center">
              {meal.recipeName}
            </Typography.Heading>
          </Card.Description>
        </Card.Body>
      </Card>
    </PressableFeedback>
  );
};

export default MealCard;
