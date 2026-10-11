import { MEAL_SLOT_LABELS } from "@/features/plan/plan-types";
import {
  useStandingMeals,
  useVisibleSlots,
} from "@/features/plan/hooks/use-plan";
import { useHome } from "@/features/home/hooks/use-home";
import { useRecurringItems } from "@/features/shopping-list/hooks/use-shopping-list";
import { StyledIonicons } from "@/utils/helpers";
import { router } from "expo-router";
import { Chip, Label, ListGroup, Separator, Typography } from "heroui-native";
import { ComponentProps } from "react";
import { ScrollView, View } from "react-native";

type IconName = ComponentProps<typeof StyledIonicons>["name"];

const ItemIcon = ({ name }: { name: IconName }) => (
  <ListGroup.ItemPrefix>
    <StyledIonicons name={name} size={24} className="text-foreground" />
  </ListGroup.ItemPrefix>
);

// Platshållare för inställningar som är planerade men inte byggda än.
const ComingSoonItem = ({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) => (
  <ListGroup.Item disabled className="opacity-50">
    <ItemIcon name={icon} />
    <ListGroup.ItemContent>
      <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
      <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
    </ListGroup.ItemContent>
    <Chip size="sm">
      <Chip.Label>Kommer snart</Chip.Label>
    </Chip>
  </ListGroup.Item>
);

const SettingsIndex = () => {
  const { data: home } = useHome();
  const visibleSlots = useVisibleSlots();
  const standingCount = useStandingMeals().data?.length;
  const recurringCount = useRecurringItems().data?.length;

  const slotsSummary = visibleSlots.data
    ?.map((s) => MEAL_SLOT_LABELS[s])
    .join(", ");

  return (
    // Safe area på en yttre View, som på Hem-fliken — fliken har ingen header
    // som skjuter ner innehållet förbi kameran.
    <View className="flex-1 pt-safe">
      <ScrollView contentContainerClassName="grow gap-6 px-4 pt-4 pb-6">
        <Typography.Heading type="h2" weight="bold">
          Inställningar
        </Typography.Heading>

        {/* ---- Hemmet ---- */}
        <View className="gap-2">
          <Label>Hemmet</Label>
          <ListGroup>
            <ListGroup.Item onPress={() => router.push("/manage-home")}>
              <ItemIcon name="home-outline" />
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Hantera hemmet</ListGroup.ItemTitle>
                <ListGroup.ItemDescription numberOfLines={1}>
                  {home ? `${home.name} · namn, medlemmar och inbjudningar` : ""}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* ---- Planering ---- */}
        <View className="gap-2">
          <Label>Planering</Label>
          <ListGroup>
            <ListGroup.Item onPress={() => router.push("/meal-slots")}>
              <ItemIcon name="restaurant-outline" />
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Måltider per dag</ListGroup.ItemTitle>
                <ListGroup.ItemDescription numberOfLines={1}>
                  {slotsSummary ?? "Välj vilka måltider ni planerar"}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
            <Separator className="mx-4" />
            <ListGroup.Item onPress={() => router.push("/standing-meals")}>
              <ItemIcon name="repeat-outline" />
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Stående måltider</ListGroup.ItemTitle>
                <ListGroup.ItemDescription numberOfLines={1}>
                  {standingCount
                    ? `${standingCount} st som återkommer varje vecka`
                    : "Recept som återkommer varje vecka"}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
            <Separator className="mx-4" />
            <ComingSoonItem
              icon="bookmark-outline"
              title="Sparade veckor"
              description="Återanvänd en hel veckoplan"
            />
          </ListGroup>
        </View>

        {/* ---- Inköp ---- */}
        <View className="gap-2">
          <Label>Inköp</Label>
          <ListGroup>
            <ListGroup.Item onPress={() => router.push("/store-order")}>
              <ItemIcon name="swap-vertical-outline" />
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Butiksordning</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  Sortera listan som du går i affären
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
            <Separator className="mx-4" />
            <ListGroup.Item onPress={() => router.push("/recurring-items")}>
              <ItemIcon name="cart-outline" />
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Återkommande varor</ListGroup.ItemTitle>
                <ListGroup.ItemDescription numberOfLines={1}>
                  {recurringCount
                    ? `${recurringCount} st på varje veckas lista`
                    : "Läggs till på varje veckas lista"}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </ListGroup>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsIndex;
