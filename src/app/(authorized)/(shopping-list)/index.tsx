import Fab from "@/components/fab";
import HomeTopBar from "@/features/home/components/home-top-bar";
import { useHome } from "@/features/home/hooks/use-home";
import WeekPicker from "@/features/plan/components/week-picker";
import AddItemSheet from "@/features/shopping-list/components/add-item-sheet";
import CostSheet from "@/features/shopping-list/components/cost-sheet";
import ListCategorySection from "@/features/shopping-list/components/list-category-section";
import {
  useCategoryOrder,
  useDeleteListItem,
  useGenerateShoppingList,
  useShoppingList,
  useToggleItem,
} from "@/features/shopping-list/hooks/use-shopping-list";
import {
  DEFAULT_CATEGORY_ORDER,
  formatKr,
  groupItems,
  isNeeded,
  isPlanChanged,
  listWeeks,
  ShoppingListItem,
} from "@/features/shopping-list/shopping-list-types";
import { IsoDate, isoWeek, today, weekMonday } from "@/lib/dates";
import { StyledIonicons } from "@/utils/helpers";
import { useLocalSearchParams } from "expo-router";
import {
  Button,
  FieldError,
  PressableFeedback,
  Spinner,
  Surface,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";

// Vilket ark som är öppet. key ger arket en ny montering per öppning — samma
// mönster som veckoplanen.
type Sheet = { kind: "add" | "cost"; key: number };

const ShoppingListScreen = () => {
  const { data: home } = useHome();
  const weeks = listWeeks();
  // Veckoplanens "Generera inköpslista" skickar med sin vecka. Fliken är
  // redan monterad, så parametern läses in under renderingen när den byts
  // i stället för bara som startvärde.
  const { week } = useLocalSearchParams<{ week?: IsoDate }>();
  const [weekStart, setWeekStart] = useState<IsoDate>(
    week && weeks.includes(week) ? week : weekMonday(today()),
  );
  const [lastWeekParam, setLastWeekParam] = useState(week);
  if (week !== lastWeekParam) {
    setLastWeekParam(week);
    if (week && weeks.includes(week)) setWeekStart(week);
  }

  const list = useShoppingList(weekStart);
  const categoryOrder = useCategoryOrder();
  const generate = useGenerateShoppingList();
  const toggle = useToggleItem();
  const remove = useDeleteListItem();

  const [scrolled, setScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Sheet hålls kvar medan isSheetOpen är false, så arket hinner animeras ut
  // innan det avmonteras — samma mönster som veckoplanen.
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openSheet = (kind: Sheet["kind"]) => {
    setSheet({ kind, key: Date.now() });
    setIsSheetOpen(true);
  };

  // Andra i hemmet bockar av på sina telefoner; dra ner för att se det.
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await list.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateList = () => {
    if (!home) return;
    generate.mutate({ homeId: home.id, weekStart });
  };

  const onToggle = (item: ShoppingListItem) => {
    if (!home) return;
    toggle.mutate({
      homeId: home.id,
      weekStart,
      id: item.id,
      checked: !item.checked,
    });
  };

  // Bara det man lagt till själv, och det planen inte längre kräver, går att
  // ta bort. En genererad rad som behövs skulle komma tillbaka vid nästa
  // uppdatering, och en återkommande vara tas bort under Inställningar.
  const onLongPress = (item: ShoppingListItem) => {
    if (!home || (item.source !== "manual" && !item.isOrphaned)) return;
    return () =>
      Alert.alert(`Ta bort ${item.name}?`, undefined, [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Ta bort",
          style: "destructive",
          onPress: () =>
            remove.mutate({ homeId: home.id, weekStart, id: item.id }),
        },
      ]);
  };

  const data = list.data;
  const items = data?.items ?? [];
  const groups = groupItems(
    items,
    categoryOrder.data ?? DEFAULT_CATEGORY_ORDER,
  );
  const needed = items.filter(isNeeded);
  const left = needed.filter((item) => !item.checked).length;

  const isLoading = list.isPending || categoryOrder.isPending;
  const loadFailed = list.isError || categoryOrder.isError;

  return (
    <View className="flex-1 pt-safe-offset-2">
      <HomeTopBar title="Inköpslista" scrolled={scrolled} />

      <ScrollView
        contentContainerClassName="grow gap-4 px-4 pt-2 pb-28"
        scrollEventThrottle={16}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
      >
        <WeekPicker value={weekStart} onChange={setWeekStart} weeks={weeks} />

        {isLoading ? (
          <View className="items-center py-12">
            <Spinner size="lg" />
          </View>
        ) : loadFailed ? (
          <View className="items-center gap-4 px-8 py-12">
            <Typography.Paragraph align="center" color="muted">
              Kunde inte hämta inköpslistan
            </Typography.Paragraph>
            <Button
              variant="secondary"
              onPress={() => {
                list.refetch();
                categoryOrder.refetch();
              }}
            >
              <Button.Label>Försök igen</Button.Label>
            </Button>
          </View>
        ) : (
          <>
            <FieldError isInvalid={!!generate.error}>
              {generate.error?.code === "P0001"
                ? generate.error.message
                : "Kunde inte uppdatera inköpslistan"}
            </FieldError>
            <FieldError isInvalid={!!toggle.error || !!remove.error}>
              Kunde inte spara ändringen. Försök igen.
            </FieldError>

            {!data?.generatedAt ? (
              // Ingen lista alls, eller en som bara har egna varor.
              <Surface
                variant="secondary"
                className="items-center gap-3 rounded-2xl p-6"
              >
                <StyledIonicons
                  name="cart-outline"
                  size={32}
                  className="text-muted"
                />
                <Typography.Paragraph align="center" color="muted">
                  {data
                    ? "Varorna från veckoplanen är inte hämtade än."
                    : `Ingen inköpslista för vecka ${isoWeek(weekStart)} än.`}
                </Typography.Paragraph>
                <Button
                  isDisabled={!home || generate.isPending}
                  onPress={generateList}
                >
                  <Button.Label>
                    {generate.isPending
                      ? "Hämtar…"
                      : "Hämta från veckoplanen"}
                  </Button.Label>
                </Button>
              </Surface>
            ) : (
              <>
                <Typography.Paragraph type="body-sm" color="muted">
                  {needed.length === 0
                    ? "Listan är tom"
                    : left === 0
                      ? `Allt avbockat · ${needed.length} varor`
                      : `${left} kvar av ${needed.length}`}
                </Typography.Paragraph>

                {isPlanChanged(data) && (
                  <PlanChangedBanner
                    isPending={generate.isPending}
                    onUpdate={generateList}
                  />
                )}
              </>
            )}

            {groups.map((group, i) => (
              <ListCategorySection
                key={group.category}
                group={group}
                isFirst={i === 0}
                onToggle={onToggle}
                onLongPress={onLongPress}
              />
            ))}

            {items.some((item) => item.source === "manual") && (
              <Typography.Paragraph type="body-xs" color="muted" align="center">
                Håll inne på en tillagd vara för att ta bort den.
              </Typography.Paragraph>
            )}

            <PressableFeedback onPress={() => openSheet("cost")}>
              <Surface className="flex-row items-center gap-3 rounded-2xl p-4">
                <View className="flex-1">
                  <Typography.Heading type="h6" weight="bold">
                    {weekStart === weekMonday(today())
                      ? "Totalt denna vecka"
                      : `Totalt vecka ${isoWeek(weekStart)}`}
                  </Typography.Heading>
                  <Typography.Paragraph type="body-xs" color="muted">
                    {data?.totalCost != null
                      ? "Tryck för snitt och graf"
                      : "Valfritt · bara du fyller i"}
                  </Typography.Paragraph>
                </View>
                {data?.totalCost != null ? (
                  <Typography.Heading type="h5" weight="bold">
                    {formatKr(data.totalCost)}
                  </Typography.Heading>
                ) : (
                  <StyledIonicons
                    name="chevron-forward"
                    size={18}
                    className="text-muted"
                  />
                )}
              </Surface>
            </PressableFeedback>
          </>
        )}
      </ScrollView>

      {!isLoading && !loadFailed && <Fab onPress={() => openSheet("add")} />}

      {sheet?.kind === "add" && (
        <AddItemSheet
          key={sheet.key}
          weekStart={weekStart}
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
      {sheet?.kind === "cost" && (
        <CostSheet
          key={sheet.key}
          weekStart={weekStart}
          totalCost={data?.totalCost ?? null}
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </View>
  );
};

// Avbockningar överlever en uppdatering: generate_shopping_list skriver
// aldrig över checked, så det man redan lagt i vagnen förblir avbockat.
const PlanChangedBanner = ({
  isPending,
  onUpdate,
}: {
  isPending: boolean;
  onUpdate: () => void;
}) => (
  <Surface className="flex-row items-center gap-3 rounded-2xl border border-warning bg-warning-soft p-3">
    <View className="h-10 w-10 items-center justify-center rounded-xl bg-warning/20">
      <StyledIonicons name="sync" size={20} className="text-warning" />
    </View>
    <Typography.Paragraph
      type="body-sm"
      weight="semibold"
      className="flex-1 text-warning-soft-foreground"
    >
      Planen har ändrats sedan listan skapades.
    </Typography.Paragraph>
    <Button size="sm" isDisabled={isPending} onPress={onUpdate}>
      <Button.Label>{isPending ? "Uppdaterar…" : "Uppdatera"}</Button.Label>
    </Button>
  </Surface>
);

export default ShoppingListScreen;
