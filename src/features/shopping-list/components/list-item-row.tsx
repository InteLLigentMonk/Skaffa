import { formatAmount } from "@/lib/units";
import { StyledIonicons } from "@/utils/helpers";
import { Checkbox, Chip, PressableFeedback, Typography } from "heroui-native";
import { View } from "react-native";
import { ShoppingListItem } from "../shopping-list-types";

type Props = {
  item: ShoppingListItem;
  onToggle: () => void;
  /** Utelämnad = raden går inte att ta bort (genererad och fortfarande behövd). */
  onLongPress?: () => void;
};

const SourceChip = ({ item }: { item: ShoppingListItem }) => {
  if (item.isOrphaned && !item.checked) {
    return (
      <Chip size="sm" variant="soft" color="default">
        <Chip.Label>Inte i planen</Chip.Label>
      </Chip>
    );
  }
  if (item.source === "recurring") {
    return (
      <Chip size="sm" variant="soft" color="success">
        <StyledIonicons name="repeat" size={12} className="text-success" />
        <Chip.Label>Återkommande</Chip.Label>
      </Chip>
    );
  }
  if (item.source === "manual") {
    return (
      <Chip size="sm" variant="soft" color="warning">
        <StyledIonicons name="pencil" size={11} className="text-warning" />
        <Chip.Label>Tillagd</Chip.Label>
      </Chip>
    );
  }
  return null;
};

const ListItemRow = ({ item, onToggle, onLongPress }: Props) => {
  const amount =
    item.amountBase !== null && item.dimension
      ? formatAmount(item.amountBase, item.dimension).label
      : null;
  // Föräldralösa rader ligger kvar för att ingen ska bli överraskad av att
  // något försvann, men de ska inte se ut som något man måste handla.
  const isDimmed = item.checked || item.isOrphaned;

  return (
    <PressableFeedback
      onPress={onToggle}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
    >
      <View className="flex-row items-center gap-3 py-3">
        <Checkbox isSelected={item.checked} onSelectedChange={onToggle} />
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <Typography.Paragraph
            className={item.checked ? "line-through" : ""}
            color={isDimmed ? "muted" : "default"}
          >
            {item.name}
          </Typography.Paragraph>
          <SourceChip item={item} />
        </View>
        {amount && (
          <Typography.Paragraph
            weight="bold"
            color={isDimmed ? "muted" : "default"}
          >
            {amount}
          </Typography.Paragraph>
        )}
      </View>
    </PressableFeedback>
  );
};

export default ListItemRow;
