import Category from "@/features/ingredients/components/category";
import {
  CATEGORY_LABELS,
  IngredientCategory,
} from "@/features/ingredients/ingredient-types";
import { useHome } from "@/features/home/hooks/use-home";
import {
  useCategoryOrder,
  useSetCategoryOrder,
} from "@/features/shopping-list/hooks/use-shopping-list";
import { DEFAULT_CATEGORY_ORDER } from "@/features/shopping-list/shopping-list-types";
import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  FieldError,
  Spinner,
  Surface,
  Typography,
} from "heroui-native";
import { Pressable, View } from "react-native";
import ReorderableList, {
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import { withUniwind } from "uniwind";

const StyledReorderableList = withUniwind(
  ReorderableList<IngredientCategory>,
);

// Egen komponent: useReorderableDrag och useIsActive måste anropas inuti en
// rad som listan renderat.
const CategoryRow = ({
  category,
  position,
}: {
  category: IngredientCategory;
  position: number;
}) => {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    // Långtryck var som helst på raden, eller direkt på handtaget.
    <Pressable onLongPress={drag} delayLongPress={200} className="py-1">
      <Surface
        className={`flex-row items-center gap-3 py-2 ${isActive ? "shadow-lg" : ""}`}
      >
        <Typography.Paragraph
          type="body-sm"
          color="muted"
          className="w-5 text-right"
        >
          {position}
        </Typography.Paragraph>
        <Category category={category} />
        <Typography.Paragraph weight="semibold" className="flex-1">
          {CATEGORY_LABELS[category]}
        </Typography.Paragraph>
        <Pressable
          onPressIn={drag}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Flytta ${CATEGORY_LABELS[category]}`}
          className="p-1"
        >
          <StyledIonicons
            name="reorder-three-outline"
            size={24}
            className="text-muted"
          />
        </Pressable>
      </Surface>
    </Pressable>
  );
};

const StoreOrder = () => {
  const { data: home } = useHome();
  const order = useCategoryOrder();
  const setOrder = useSetCategoryOrder();

  if (order.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>
    );
  }

  if (order.isError || !home) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Typography.Paragraph color="muted" align="center">
          Kunde inte läsa butiksordningen.
        </Typography.Paragraph>
        <Button variant="secondary" onPress={() => order.refetch()}>
          <Button.Label>Försök igen</Button.Label>
        </Button>
      </View>
    );
  }

  const isDefault =
    order.data.length === DEFAULT_CATEGORY_ORDER.length &&
    order.data.every((c, i) => c === DEFAULT_CATEGORY_ORDER[i]);

  return (
    <StyledReorderableList
      data={order.data}
      keyExtractor={(category) => category}
      onReorder={({ from, to }) =>
        setOrder.mutate({
          homeId: home.id,
          order: reorderItems(order.data, from, to),
        })
      }
      renderItem={({ item, index }) => (
        <CategoryRow category={item} position={index + 1} />
      )}
      contentContainerClassName="px-4 py-6"
      ListHeaderComponent={
        <Typography.Paragraph type="body-sm" color="muted" className="pb-3">
          Dra kategorierna i den ordning du går genom affären. Inköpslistan
          sorteras efter den. Gäller hela hemmet.
        </Typography.Paragraph>
      }
      ListFooterComponent={
        <View className="gap-2 pt-4">
          <FieldError isInvalid={!!setOrder.error}>
            Kunde inte spara ordningen. Försök igen.
          </FieldError>
          {!isDefault && (
            <Button
              variant="ghost"
              onPress={() =>
                setOrder.mutate({
                  homeId: home.id,
                  order: DEFAULT_CATEGORY_ORDER,
                })
              }
            >
              <Button.Label>Återställ standardordningen</Button.Label>
            </Button>
          )}
        </View>
      }
    />
  );
};

export default StoreOrder;
