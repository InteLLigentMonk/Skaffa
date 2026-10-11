import Category from "@/features/ingredients/components/category";
import { useRecurringItems } from "@/features/shopping-list/hooks/use-shopping-list";
import { formatAmount } from "@/lib/units";
import { StyledIonicons } from "@/utils/helpers";
import { router } from "expo-router";
import {
  Button,
  ListGroup,
  Separator,
  Spinner,
  Typography,
} from "heroui-native";
import { Fragment } from "react";
import { ScrollView, View } from "react-native";

const RecurringItems = () => {
  const recurring = useRecurringItems();
  const items = recurring.data ?? [];

  return (
    <ScrollView contentContainerClassName="grow gap-4 px-4 py-6">
      <Typography.Paragraph type="body-sm" color="muted">
        Varor som läggs på varje veckas inköpslista, till exempel mjölk,
        kaffe eller bröd. Gäller hela hemmet.
      </Typography.Paragraph>

      {recurring.isPending ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : recurring.isError ? (
        <View className="items-center gap-2 py-6">
          <Typography.Paragraph color="muted">
            Kunde inte läsa de återkommande varorna.
          </Typography.Paragraph>
          <Button variant="secondary" onPress={() => recurring.refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : items.length > 0 ? (
        <ListGroup>
          {items.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 && <Separator className="mx-4" />}
              <ListGroup.Item
                onPress={() =>
                  router.push({
                    pathname: "/recurring-item",
                    params: { id: item.id },
                  })
                }
              >
                <ListGroup.ItemPrefix>
                  <Category category={item.ingredient.category} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{item.ingredient.name}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {item.amountBase
                      ? formatAmount(item.amountBase, item.ingredient.dimension)
                          .label
                      : "Ingen mängd"}
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix />
              </ListGroup.Item>
            </Fragment>
          ))}
        </ListGroup>
      ) : (
        <Typography.Paragraph color="muted" align="center" className="py-4">
          Inga återkommande varor än.
        </Typography.Paragraph>
      )}

      <Button
        variant="tertiary"
        className="rounded-2xl bg-field"
        onPress={() => router.push("/recurring-item")}
      >
        <StyledIonicons name="add" size={20} className="text-foreground" />
        <Button.Label>Lägg till vara</Button.Label>
      </Button>
    </ScrollView>
  );
};

export default RecurringItems;
