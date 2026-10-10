import { Emoji } from "@/components/emoji";
import { StyledIonicons } from "@/utils/helpers";
import { Image } from "expo-image";
import {
  Menu,
  PressableFeedback,
  Spinner,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { RecipeImageSource, UseRecipeImage } from "../hooks/use-recipe-image";
import MenuRow from "./recipe-menu-row";

const StyledImage = withUniwind(Image);

type Props = {
  image: UseRecipeImage;
  placeholderEmoji: string;
};

// Formulärets toppbild, med samma mått som detaljsidans. Knappen och
// förhandsvisningen är samma yta i alla tillstånd — inget i formuläret flyttar
// sig när bilden kommer. "Byt", "Ta bort" och "Försök igen" ligger i en meny
// bakom ytan.
//
// Arket under lägger sig 24 px upp över bilden (-mt-6), så allt som ska synas
// längst ner ligger minst så högt.
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
    <Menu
      isOpen={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      isDisabled={image.isUploading}
    >
      <Menu.Trigger asChild>
        <PressableFeedback
          accessibilityRole="button"
          accessibilityLabel={status === "empty" ? "Lägg till bild" : "Ändra bild"}
          className="h-72 w-full overflow-hidden bg-secondary-soft"
        >
          {previewUri ? (
            <StyledImage
              source={{ uri: previewUri }}
              className="size-full"
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="size-full items-center justify-center gap-2 pb-6">
              <Emoji size={72}>{placeholderEmoji}</Emoji>
              <View className="flex-row items-center gap-1.5">
                <StyledIonicons
                  name="camera-outline"
                  size={18}
                  className="text-muted"
                />
                <Typography.Paragraph weight="bold" color="muted">
                  Lägg till bild
                </Typography.Paragraph>
              </View>
              <Typography.Paragraph type="body-xs" color="muted">
                Krävs för att publicera
              </Typography.Paragraph>
            </View>
          )}

          {status === "done" && previewUri && (
            <View className="absolute bottom-9 right-4 flex-row items-center gap-1.5 rounded-full bg-background px-3 py-1.5">
              <StyledIonicons
                name="camera-outline"
                size={16}
                className="text-foreground"
              />
              <Typography.Paragraph type="body-sm" weight="bold">
                Byt bild
              </Typography.Paragraph>
            </View>
          )}
          {status === "uploading" && (
            <View className="absolute inset-0 items-center justify-center bg-black/40 pb-6">
              <Spinner size="lg" color="white" />
            </View>
          )}
          {status === "error" && (
            <View className="absolute inset-0 items-center justify-center gap-2 bg-black/50 pb-6">
              <StyledIonicons name="refresh" size={32} className="text-white" />
              <Typography.Paragraph weight="bold" className="text-white">
                Uppladdningen misslyckades
              </Typography.Paragraph>
            </View>
          )}
        </PressableFeedback>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content
          presentation="popover"
          placement="bottom"
          align="center"
          width={240}
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
  );
};

export default RecipeImageField;
