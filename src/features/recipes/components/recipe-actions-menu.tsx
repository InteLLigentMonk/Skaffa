import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  Dialog,
  FieldError,
  Menu,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import MenuRow from "./recipe-menu-row";

type Props = {
  recipeName: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDuplicating: boolean;
  isDeleting: boolean;
  error: string | null;
};

// Publicera är avstängt tills publiceringsflödet finns. Publicering kräver
// steg och bild (guard_publish_requirements).
const RecipeActionsMenu = ({
  recipeName,
  onEdit,
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
        {/* asChild: triggern blir samma Button som favorit- och
            tillbaka-knappen, så storleken följer HeroUI i stället för en egen
            size-klass som kan glida isär. */}
        <Menu.Trigger asChild>
          <Button
            variant="tertiary"
            isIconOnly
            accessibilityLabel="Fler val"
            className="rounded-full bg-background"
          >
            <StyledIonicons
              name="ellipsis-vertical"
              size={20}
              className="text-foreground"
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
              icon="create-outline"
              title="Redigera recept"
              onPress={onEdit}
            />
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

export default RecipeActionsMenu;
