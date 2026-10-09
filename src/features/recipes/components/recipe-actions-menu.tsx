import { StyledIonicons } from "@/utils/helpers";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Dialog,
  FieldError,
  Menu,
} from "heroui-native";
import { ComponentProps, useState } from "react";
import { View } from "react-native";

type Props = {
  recipeName: string;
  onDuplicate: () => void;
  onDelete: () => void;
  isDuplicating: boolean;
  isDeleting: boolean;
  error: string | null;
};

// Redigera och Publicera är avstängda tills receptformuläret klarar steg och
// bild — publicering kräver båda (guard_publish_requirements).
const RecipeActionsMenu = ({
  recipeName,
  onDuplicate,
  onDelete,
  isDuplicating,
  isDeleting,
  error,
}: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <Menu isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Menu.Trigger
          className="size-10 items-center justify-center rounded-full bg-background"
          accessibilityLabel="Fler val"
        >
          <StyledIonicons
            name="ellipsis-vertical"
            size={20}
            className="text-foreground"
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Overlay />
          <Menu.Content
            presentation="popover"
            placement="bottom"
            align="end"
            width={220}
          >
            <MenuRow icon="create-outline" title="Redigera recept" isDisabled />
            <MenuRow icon="globe-outline" title="Publicera" isDisabled />
            <MenuRow
              icon="copy-outline"
              title={isDuplicating ? "Duplicerar…" : "Duplicera"}
              isDisabled={isDuplicating}
              onPress={onDuplicate}
            />
            <MenuRow
              icon="trash-outline"
              title="Ta bort recept"
              variant="danger"
              onPress={() => setIsConfirmOpen(true)}
            />
          </Menu.Content>
        </Menu.Portal>
      </Menu>

      <Dialog isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="gap-4">
            <View className="gap-1">
              <Dialog.Title>Ta bort {recipeName}?</Dialog.Title>
              <Dialog.Description>
                Receptet tas bort för hela hemmet, och det försvinner ur
                veckoplanen där det är inplanerat. Det går inte att ångra.
              </Dialog.Description>
            </View>
            <FieldError isInvalid={!!error}>{error}</FieldError>
            <View className="flex-row gap-2">
              <Button
                variant="tertiary"
                className="flex-1"
                onPress={() => setIsConfirmOpen(false)}
              >
                <Button.Label>Avbryt</Button.Label>
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                isDisabled={isDeleting}
                onPress={onDelete}
              >
                <Button.Label>{isDeleting ? "Tar bort…" : "Ta bort"}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
};

const MenuRow = ({
  icon,
  title,
  variant = "default",
  isDisabled,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  variant?: "default" | "danger";
  isDisabled?: boolean;
  onPress?: () => void;
}) => (
  <Menu.Item variant={variant} isDisabled={isDisabled} onPress={onPress}>
    <View
      className={`flex flex-row items-center gap-3 ${isDisabled ? "opacity-40" : ""}`}
    >
      <StyledIonicons
        name={icon}
        size={20}
        className={variant === "danger" ? "text-danger" : "text-foreground"}
      />
      <Menu.ItemTitle>{title}</Menu.ItemTitle>
    </View>
  </Menu.Item>
);

export default RecipeActionsMenu;
