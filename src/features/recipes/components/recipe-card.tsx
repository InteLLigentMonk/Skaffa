import { Emoji } from "@/components/emoji";
import { StyledIonicons } from "@/utils/helpers";
import { Image } from "expo-image";
import { Card, PressableFeedback, Typography } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { DIET_EMOJI, RecipeCardData } from "../recipe-types";

const StyledImage = withUniwind(Image);

type Props = {
  recipe: RecipeCardData;
  width: number;
  onPress: () => void;
  onLongPress: () => void;
};

const RecipeCard = ({ recipe, width, onPress, onLongPress }: Props) => {
  return (
    <PressableFeedback
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width }}
    >
      <Card className="gap-2 p-2">
        {recipe.imageUrl ? (
          <StyledImage
            // cacheKey på sökvägen: en ny signerad URL för samma bild ska
            // träffa cachen, inte ladda ner bilden igen.
            source={{ uri: recipe.imageUrl, cacheKey: recipe.imagePath ?? undefined }}
            className="w-full aspect-[4/3] rounded-xl"
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="w-full aspect-[4/3] rounded-xl bg-secondary-soft items-center justify-center">
            <Emoji size={40}>
              {recipe.diet ? DIET_EMOJI[recipe.diet] : "🍽️"}
            </Emoji>
          </View>
        )}
        <Card.Body className="gap-1 px-1 pb-1">
          <Typography.Heading type="h6" numberOfLines={2}>
            {recipe.name}
          </Typography.Heading>
          {recipe.prepMinutes !== null && (
            <View className="flex-row items-center gap-1">
              <StyledIonicons
                name="time-outline"
                size={14}
                className="text-muted"
              />
              <Typography.Paragraph type="body-sm" color="muted">
                {recipe.prepMinutes} min
              </Typography.Paragraph>
            </View>
          )}
        </Card.Body>
      </Card>
    </PressableFeedback>
  );
};

export default RecipeCard;
