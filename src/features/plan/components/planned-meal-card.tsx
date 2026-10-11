import { Emoji } from "@/components/emoji";
import MenuRow from "@/features/recipes/components/recipe-menu-row";
import { StyledIonicons } from "@/utils/helpers";
import { Image } from "expo-image";
import {
  Button,
  Menu,
  PressableFeedback,
  Surface,
  Typography,
} from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { PlannedMeal } from "../plan-types";

const StyledImage = withUniwind(Image);

export type PlannedMealAction = "servings" | "swap" | "move" | "delete";

type Props = {
  meal: PlannedMeal;
  onPress: () => void;
  /** Utelämnas för passerade dagar: då finns ingen meny. */
  onAction?: (action: PlannedMealAction) => void;
  isDeleting?: boolean;
};

const PlannedMealCard = ({ meal, onPress, onAction, isDeleting }: Props) => {
  return (
    <PressableFeedback onPress={onPress} isDisabled={isDeleting}>
      <Surface
        className={`flex-row items-center gap-3 rounded-2xl p-2 ${isDeleting ? "opacity-40" : ""}`}
      >
        {meal.imageUrl ? (
          <StyledImage
            // cacheKey på sökvägen, som receptkortet: en ny signerad URL ska
            // träffa cachen.
            source={{ uri: meal.imageUrl, cacheKey: meal.imagePath ?? undefined }}
            className="size-12 rounded-xl"
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="size-12 items-center justify-center rounded-xl bg-secondary-soft">
            <Emoji size={24}>🍽️</Emoji>
          </View>
        )}

        <View className="flex-1">
          <Typography.Heading type="h6" weight="bold" numberOfLines={1}>
            {meal.recipeName}
          </Typography.Heading>
          <Typography.Paragraph type="body-sm" color="muted">
            {meal.servings} {meal.servings === 1 ? "portion" : "portioner"}
          </Typography.Paragraph>
        </View>

        {onAction && (
          <Menu>
            <Menu.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                className="rounded-full"
                accessibilityLabel={`Fler val för ${meal.recipeName}`}
              >
                <StyledIonicons
                  name="ellipsis-horizontal"
                  size={20}
                  className="text-muted"
                />
              </Button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Overlay />
              <Menu.Content
                presentation="popover"
                placement="bottom"
                align="end"
                width={220}
              >
                <MenuRow
                  icon="people-outline"
                  title="Ändra portioner"
                  onPress={() => onAction("servings")}
                />
                <MenuRow
                  icon="swap-horizontal-outline"
                  title="Byt recept"
                  onPress={() => onAction("swap")}
                />
                <MenuRow
                  icon="calendar-outline"
                  title="Flytta"
                  onPress={() => onAction("move")}
                />
                <MenuRow
                  icon="trash-outline"
                  title="Ta bort"
                  variant="danger"
                  onPress={() => onAction("delete")}
                />
              </Menu.Content>
            </Menu.Portal>
          </Menu>
        )}
      </Surface>
    </PressableFeedback>
  );
};

export default PlannedMealCard;
