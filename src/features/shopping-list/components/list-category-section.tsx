import { Emoji } from "@/components/emoji";
import {
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "@/features/ingredients/ingredient-types";
import { Separator, Typography } from "heroui-native";
import { Fragment } from "react";
import { View } from "react-native";
import { ItemGroup, ShoppingListItem } from "../shopping-list-types";
import ListItemRow from "./list-item-row";

type Props = {
  group: ItemGroup;
  /** Första kategorin visar att ordningen är butiksordningen. */
  isFirst: boolean;
  onToggle: (item: ShoppingListItem) => void;
  /** Returnerar undefined för rader som inte går att ta bort. */
  onLongPress: (item: ShoppingListItem) => (() => void) | undefined;
};

const ListCategorySection = ({
  group,
  isFirst,
  onToggle,
  onLongPress,
}: Props) => {
  return (
    <View>
      <View className="flex-row items-center gap-2 pb-1">
        {/* Mindre än Category-komponenten: rubriken ska inte konkurrera med
            raderna under den. */}
        <View
          className={`h-7 w-7 items-center justify-center rounded-lg ${CATEGORY_COLORS[group.category]}`}
        >
          <Emoji size={14}>{CATEGORY_EMOJI[group.category]}</Emoji>
        </View>
        <Typography.Heading type="h6" weight="bold" className="flex-1">
          {CATEGORY_LABELS[group.category]}
        </Typography.Heading>
        {isFirst && (
          <Typography.Paragraph type="body-xs" color="muted">
            butiksordning
          </Typography.Paragraph>
        )}
      </View>
      {group.items.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 && <Separator />}
          <ListItemRow
            item={item}
            onToggle={() => onToggle(item)}
            onLongPress={onLongPress(item)}
          />
        </Fragment>
      ))}
    </View>
  );
};

export default ListCategorySection;
