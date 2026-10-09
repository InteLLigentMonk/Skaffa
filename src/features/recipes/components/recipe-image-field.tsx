import { Emoji } from "@/components/emoji";
import { StyledIonicons } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Menu,
  PressableFeedback,
  Spinner,
  Typography,
} from "heroui-native";
import { ComponentProps, useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { RecipeImageSource, UseRecipeImage } from "../hooks/use-recipe-image";

const StyledImage = withUniwind(Image);

type Props = {
  image: UseRecipeImage;
  placeholderEmoji: string;
};

// Knappen och förhandsvisningen är samma ruta, med samma mått i alla
// tillstånd — inget i formuläret flyttar sig när bilden kommer.
//
// 80 px rymmer inga knappar, så "Byt", "Ta bort" och "Försök igen" ligger i
// en meny bakom rutan i stället för ovanpå den.
const RecipeImageField = ({ image, placeholderEmoji }: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { status, previewUri } = image;

  // Menyn stängs innan väljaren öppnas, annars ligger popovern kvar över
  // kameran på iOS.
  const choose = (action: () => void) => () => {
    setIsMenuOpen(false);
    action();
  };
  const pick = (source: RecipeImageSource) => choose(() => image.pick(source));

  return (
    <View className="items-center gap-1">
      <Menu
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        isDisabled={image.isUploading}
      >
        <Menu.Trigger asChild>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={
              status === "empty" ? "Lägg till bild" : "Ändra bild"
            }
            className="size-20 overflow-hidden rounded-2xl bg-secondary-soft"
          >
            {previewUri ? (
              <StyledImage
                source={{ uri: previewUri }}
                className="size-full"
                contentFit="cover"
              />
            ) : (
              <View className="size-full items-center justify-center gap-0.5 p-1">
                <Emoji size={22}>{placeholderEmoji}</Emoji>
                <Typography.Paragraph
                  type="body-xs"
                  color="muted"
                  className="text-center leading-tight"
                >
                  Lägg till bild
                </Typography.Paragraph>
                <View className="absolute right-1 top-1">
                  <StyledIonicons
                    name="camera-outline"
                    size={14}
                    className="text-muted"
                  />
                </View>
              </View>
            )}

            {status === "uploading" && (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <Spinner color="white" />
              </View>
            )}
            {status === "error" && (
              <View className="absolute inset-0 items-center justify-center bg-black/50">
                <StyledIonicons
                  name="refresh"
                  size={24}
                  className="text-white"
                />
              </View>
            )}
          </PressableFeedback>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Overlay />
          <Menu.Content
            presentation="popover"
            placement="bottom"
            align="end"
            width={220}
          >
            {status === "error" && (
              <MenuRow
                icon="refresh-outline"
                title="Försök igen"
                onPress={choose(image.retry)}
              />
            )}
            <MenuRow
              icon="camera-outline"
              title={status === "empty" ? "Ta foto" : "Byt: ta foto"}
              onPress={pick("camera")}
            />
            <MenuRow
              icon="images-outline"
              title={
                status === "empty" ? "Välj från bilder" : "Byt: välj från bilder"
              }
              onPress={pick("library")}
            />
            {status !== "empty" && (
              <MenuRow
                icon="trash-outline"
                title="Ta bort"
                variant="danger"
                onPress={choose(image.remove)}
              />
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu>
      <Typography.Paragraph
        type="body-xs"
        color="muted"
        className="w-24 text-center"
      >
        *Krävs för att publicera
      </Typography.Paragraph>
    </View>
  );
};

const MenuRow = ({
  icon,
  title,
  variant = "default",
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  variant?: "default" | "danger";
  onPress: () => void;
}) => (
  <Menu.Item variant={variant} onPress={onPress}>
    <View className="flex flex-row items-center gap-3">
      <StyledIonicons
        name={icon}
        size={20}
        className={variant === "danger" ? "text-danger" : "text-foreground"}
      />
      <Menu.ItemTitle>{title}</Menu.ItemTitle>
    </View>
  </Menu.Item>
);

export default RecipeImageField;
