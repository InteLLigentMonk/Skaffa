import NumberSelect from "@/components/number-select";
import { RecipeScope } from "@/features/recipes/recipe-types";
import {
  addDays,
  formatDayLong,
  IsoDate,
  today,
  weekdayLong,
  weekMonday,
} from "@/lib/dates";
import {
  Alert,
  BottomSheet,
  Button,
  Chip,
  FieldError,
  Spinner,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { usePlannedMeals, usePlanRecipe, useVisibleSlots } from "../hooks/use-plan";
import {
  groupMeals,
  MEAL_SLOT_LABELS,
  mealKey,
  MealSlot,
  PLAN_WEEKS_AHEAD,
} from "../plan-types";
import DayPicker from "./day-picker";
import WeekPicker from "./week-picker";

type Props = {
  recipe: { id: string; scope: RecipeScope; name: string };
  isOpen: boolean;
  onClose: () => void;
  // Portionerna ägs av receptsidan: ändras de här syns det där också.
  servings: number;
  onServingsChange: (servings: number) => void;
};

type ConflictChoice = "add" | "replace";

const firstSelectableDay = (monday: IsoDate) => {
  const now = today();
  return monday > now ? monday : now;
};

const defaultSlot = (slots: MealSlot[]): MealSlot | null =>
  slots.includes("middag") ? "middag" : (slots[0] ?? null);

const PlanMealSheet = ({
  recipe,
  isOpen,
  onClose,
  servings,
  onServingsChange,
}: Props) => {
  const currentWeek = weekMonday(today());
  const weeks = Array.from({ length: PLAN_WEEKS_AHEAD + 1 }, (_, i) =>
    addDays(currentWeek, i * 7),
  );
  const rangeEnd = addDays(weeks[weeks.length - 1], 6);

  // Hela intervallet i en fråga: veckoväljarens räknare behöver alla veckor
  // ändå, och att bläddra mellan veckor blir då gratis.
  const meals = usePlannedMeals(currentWeek, rangeEnd);
  const visibleSlots = useVisibleSlots();
  const plan = usePlanRecipe();

  const [weekStart, setWeekStart] = useState(currentWeek);
  const [date, setDate] = useState<IsoDate>(today());
  const [pickedSlot, setPickedSlot] = useState<MealSlot | null>(null);
  const [choice, setChoice] = useState<ConflictChoice | null>(null);

  const slots = visibleSlots.data ?? [];
  // Förvalet räknas fram tills användaren valt själv, så det följer med när
  // hemmets måltider laddats klart.
  const slot = pickedSlot ?? defaultSlot(slots);
  const grouped = groupMeals(meals.data ?? [], slots);

  const inSlot = slot ? (grouped.byMeal[mealKey(date, slot)] ?? []) : [];
  // Ett bankrecept har ett annat id än hemmets kopia av det, så kopian känns
  // igen på namnet. Räcker för att inte fråga "ersätt?" om samma rätt.
  const isSameRecipe = (meal: (typeof inSlot)[number]) =>
    meal.recipeId === recipe.id ||
    (recipe.scope === "explore" && meal.recipeName === recipe.name);
  const others = inSlot.filter((meal) => !isSameRecipe(meal));
  const alreadyPlanned = inSlot.some(isSameRecipe);
  const hasConflict = others.length > 0;

  const reset = () => {
    setWeekStart(currentWeek);
    setDate(today());
    setPickedSlot(null);
    setChoice(null);
    plan.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!slot) return;
    plan.mutate(
      {
        recipeId: recipe.id,
        scope: recipe.scope,
        date,
        slot,
        servings,
        replace: choice === "replace",
      },
      { onSuccess: close },
    );
  };

  const isBlocked = hasConflict && choice === null;
  const submitLabel = isBlocked
    ? "Välj hur ovan för att fortsätta"
    : alreadyPlanned && !hasConflict
      ? `Uppdatera portioner ${formatDayLong(date)}`
      : `Lägg till på ${formatDayLong(date)}`;

  const isLoading = meals.isPending || visibleSlots.isPending;
  const loadFailed = meals.isError || visibleSlots.isError;

  return (
    <BottomSheet
      isOpen={isOpen}
      // onOpenChange på roten fångar alla stängningar (svep, overlay, kod) —
      // se density-sheet.tsx.
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-4">
            <View>
              <BottomSheet.Title>Lägg i veckoplan</BottomSheet.Title>
              <BottomSheet.Description>
                {recipe.name} · {servings} portioner
              </BottomSheet.Description>
            </View>

            {isLoading ? (
              <View className="items-center py-8">
                <Spinner />
              </View>
            ) : loadFailed ? (
              <View className="items-center gap-3 py-6">
                <Typography.Paragraph color="muted" align="center">
                  Kunde inte hämta veckoplanen
                </Typography.Paragraph>
                <Button
                  variant="secondary"
                  onPress={() => {
                    meals.refetch();
                    visibleSlots.refetch();
                  }}
                >
                  <Button.Label>Försök igen</Button.Label>
                </Button>
              </View>
            ) : (
              <>
                <WeekPicker
                  value={weekStart}
                  onChange={(monday) => {
                    setWeekStart(monday);
                    setDate(firstSelectableDay(monday));
                    setChoice(null);
                  }}
                  weeks={weeks}
                  filledByWeek={grouped.filledByWeek}
                  capacity={7 * slots.length}
                  footer={`Du kan planera upp till ${PLAN_WEEKS_AHEAD} veckor framåt.`}
                />

                <View className="gap-2">
                  <Typography.Paragraph type="body-sm" weight="semibold">
                    Vilken dag?{" "}
                    <Typography.Paragraph type="body-xs" color="muted">
                      stapeln = redan planerat
                    </Typography.Paragraph>
                  </Typography.Paragraph>
                  <DayPicker
                    weekStart={weekStart}
                    value={date}
                    onChange={(next) => {
                      setDate(next);
                      setChoice(null);
                    }}
                    slots={slots}
                    filledByDate={grouped.filledByDate}
                    highlightSlot={slot}
                    isDateDisabled={(d) => d < today()}
                  />
                </View>

                <View className="gap-2">
                  <Typography.Paragraph type="body-sm" weight="semibold">
                    Vilken måltid?
                  </Typography.Paragraph>
                  <View className="flex-row flex-wrap gap-2">
                    {slots.map((s) => {
                      const isSelected = s === slot;
                      const isTaken =
                        (grouped.byMeal[mealKey(date, s)]?.length ?? 0) > 0;

                      return (
                        <View key={s}>
                          <Chip
                            size="lg"
                            variant={isSelected ? "soft" : "secondary"}
                            color={isSelected ? "accent" : "default"}
                            onPress={() => {
                              setPickedSlot(s);
                              setChoice(null);
                            }}
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Chip.Label>{MEAL_SLOT_LABELS[s]}</Chip.Label>
                          </Chip>
                          {isTaken && (
                            <View className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-secondary" />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {hasConflict && slot && (
                  <Alert status="warning">
                    <Alert.Indicator />
                    <Alert.Content className="gap-3">
                      <Alert.Description>
                        {capitalize(weekdayLong(date))}{" "}
                        {MEAL_SLOT_LABELS[slot].toLowerCase()} har redan{" "}
                        {others.map((meal) => meal.recipeName).join(", ")}.
                        Vill du laga båda, eller byta ut?
                      </Alert.Description>
                      <View className="flex-row gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          variant={choice === "add" ? "primary" : "outline"}
                          onPress={() => setChoice("add")}
                        >
                          <Button.Label>Lägg till som extra rätt</Button.Label>
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          variant={choice === "replace" ? "primary" : "outline"}
                          onPress={() => setChoice("replace")}
                        >
                          <Button.Label>Ersätt</Button.Label>
                        </Button>
                      </View>
                    </Alert.Content>
                  </Alert>
                )}

                <View className="flex-row items-center justify-between rounded-2xl bg-surface-secondary p-3">
                  <View>
                    <Typography.Paragraph weight="semibold">
                      Portioner
                    </Typography.Paragraph>
                    <Typography.Paragraph type="body-xs" color="muted">
                      Följer med från receptet
                    </Typography.Paragraph>
                  </View>
                  <NumberSelect value={servings} onChange={onServingsChange} />
                </View>

                <FieldError isInvalid={!!plan.error}>
                  {plan.error?.code === "P0001"
                    ? plan.error.message
                    : "Kunde inte lägga till i veckoplanen"}
                </FieldError>

                <Button
                  size="lg"
                  isDisabled={isBlocked || !slot || plan.isPending}
                  onPress={submit}
                >
                  <Button.Label>
                    {plan.isPending ? "Lägger till…" : submitLabel}
                  </Button.Label>
                </Button>
              </>
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default PlanMealSheet;
