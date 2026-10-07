import { StyledIonicons } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import { Menu, Typography } from "heroui-native";
import { ComponentProps } from "react";
import { View } from "react-native";
import { RecipeCardData, RecipeScope } from "../recipe-types";

type Props = {
  recipe: RecipeCardData | null;
  scope: RecipeScope;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

// En meny för hela rutnätet, inte en per kort: den öppnas från kortets
// onLongPress och har därför ingen Menu.Trigger. isOpen hålls separat från
// recipe så att namnet står kvar medan arket animeras ut.
//
// Posterna är platshållare. Funktionerna kommer med receptets detaljsida.
const RecipeContextMenu = ({ recipe, scope, isOpen, onOpenChange }: Props) => {
  return (
    <Menu
      presentation="bottom-sheet"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content presentation="bottom-sheet">
          <Typography.Heading
            type="h5"
            numberOfLines={1}
            className="px-3 pb-2"
          >
            {recipe?.name}
          </Typography.Heading>
          <MenuRow icon="calendar-outline" title="Lägg i veckoplan" />
          <MenuRow icon="open-outline" title="Öppna" />
          {scope === "home" ? (
            <>
              <MenuRow icon="create-outline" title="Redigera" />
              <MenuRow icon="heart-outline" title="Favorit" />
            </>
          ) : (
            <MenuRow icon="bookmark-outline" title="Spara" />
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
};

const MenuRow = ({
  icon,
  title,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
}) => (
  <Menu.Item>
    <View className="flex flex-row items-center gap-4">
      <StyledIonicons name={icon} size={24} className="text-foreground" />
      <Menu.ItemTitle>{title}</Menu.ItemTitle>
    </View>
  </Menu.Item>
);

export default RecipeContextMenu;
