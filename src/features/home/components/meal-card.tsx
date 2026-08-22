import { Image, type ImageSource } from "expo-image";
import { Card, Typography } from "heroui-native";
import { useWindowDimensions } from "react-native";
import { withUniwind } from "uniwind";

const StyledImage = withUniwind(Image);

const MealCard = ({
  imageSource,
  mealTime,
  meal,
}: {
  imageSource: ImageSource;
  mealTime: string;
  meal: string;
}) => {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 64) / 3;

  return (
    <Card className="gap-1 items-center" style={{ width: CARD_WIDTH }}>
      <StyledImage
        source={imageSource}
        className="w-full aspect-square rounded-xl"
      />
      <Card.Body className="gap-1 items-center">
        <Card.Title>
          <Typography type="body-sm" color="muted" weight="bold">
            {mealTime}
          </Typography>
        </Card.Title>
        <Card.Description numberOfLines={2}>
          <Typography.Heading type="h6" className="text-center">
            {meal}
          </Typography.Heading>
        </Card.Description>
      </Card.Body>
    </Card>
  );
};

export default MealCard;
