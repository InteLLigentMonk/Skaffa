import { useStandingMeals } from "@/features/plan/hooks/use-plan";
import { formatWeekdays, MEAL_SLOT_LABELS } from "@/features/plan/plan-types";
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

const StandingMeals = () => {
  const standing = useStandingMeals();
  // Redan sorterade per måltid (enumordningen) av getStandingMeals.
  const rules = standing.data ?? [];

  return (
    <ScrollView contentContainerClassName="grow gap-4 px-4 py-6">
      <Typography.Paragraph type="body-sm" color="muted">
        Recept som läggs in i veckoplanen av sig själva, till exempel
        fredagstacos eller gröt till frukost varje dag. Gäller hela hemmet.
      </Typography.Paragraph>

      {standing.isPending ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : standing.isError ? (
        <View className="items-center gap-2 py-6">
          <Typography.Paragraph color="muted">
            Kunde inte läsa de stående måltiderna.
          </Typography.Paragraph>
          <Button variant="secondary" onPress={() => standing.refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : rules.length > 0 ? (
        <ListGroup>
          {rules.map((rule, i) => (
            <Fragment key={rule.id}>
              {i > 0 && <Separator className="mx-4" />}
              <ListGroup.Item
                onPress={() =>
                  router.push({
                    pathname: "/standing-meal",
                    params: { id: rule.id },
                  })
                }
              >
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{rule.recipeName}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {MEAL_SLOT_LABELS[rule.slot]} ·{" "}
                    {formatWeekdays(rule.weekdays)} · {rule.servings} port.
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix />
              </ListGroup.Item>
            </Fragment>
          ))}
        </ListGroup>
      ) : (
        <Typography.Paragraph color="muted" align="center" className="py-4">
          Inga stående måltider än.
        </Typography.Paragraph>
      )}

      <Button
        variant="tertiary"
        className="rounded-2xl bg-field"
        onPress={() => router.push("/standing-meal")}
      >
        <StyledIonicons name="add" size={20} className="text-foreground" />
        <Button.Label>Lägg till stående måltid</Button.Label>
      </Button>
    </ScrollView>
  );
};

export default StandingMeals;
