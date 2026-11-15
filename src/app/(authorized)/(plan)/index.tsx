import Fab from "@/components/fab";
import HomeTopBar from "@/features/home/components/home-top-bar";
import { useHome } from "@/features/home/hooks/use-home";
import AddMealSheet from "@/features/plan/components/add-meal-sheet";
import DayPicker from "@/features/plan/components/day-picker";
import MealSlotSection from "@/features/plan/components/meal-slot-section";
import MoveMealSheet from "@/features/plan/components/move-meal-sheet";
import { PlannedMealAction } from "@/features/plan/components/planned-meal-card";
import ServingsSheet from "@/features/plan/components/servings-sheet";
import SwapRecipeSheet from "@/features/plan/components/swap-recipe-sheet";
import WeekPicker from "@/features/plan/components/week-picker";
import {
  useDeletePlannedMeal,
  usePlannedMeals,
  useVisibleSlots,
} from "@/features/plan/hooks/use-plan";
import {
  groupMeals,
  MEAL_SLOTS,
  mealKey,
  MealSlot,
  PLAN_WEEKS_AHEAD,
  PlannedMeal,
  planRange,
  planWeeks,
  sameWeekdayIn,
  sortSlots,
} from "@/features/plan/plan-types";
import { useGenerateShoppingList } from "@/features/shopping-list/hooks/use-shopping-list";
import {
  addDays,
  IsoDate,
  today,
  weekdayLong,
  weekMonday,
} from "@/lib/dates";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import {
  Button,
  Chip,
  FieldError,
  Spinner,
  Typography,
} from "heroui-native";
import { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// Hur långt (px) ett svep ska dras för att byta dag.
const SWIPE_DISTANCE = 60;
// Shared axis X: hur långt (px) dagen glider, och hur länge ut/in tar (ms).
const SLIDE_DISTANCE = 40;
const OUT_DURATION = 120;
const IN_DURATION = 180;

// Vilket ark som är öppet. key ger formuläret i arket en ny montering per
// öppning, så varje öppning börjar från början även för samma måltid.
//
// Arken själva är monterade hela tiden — montera dem inte villkorligt. gorhom
// (under HeroUI:s BottomSheet) ignorerar tyst en öppning innan arket mätt upp
// sin layout. Ett ark som monteras i samma veva som det öppnas förlorar det
// loppet: i en release-build alltid, i dev ibland. Kvar blir en osynlig
// overlay som äter nästa tryck.
type Sheet = { key: number } & (
  | { kind: "add"; slot: MealSlot | null }
  | { kind: "servings" | "swap" | "move"; meal: PlannedMeal }
);

const PlanScreen = () => {
  const router = useRouter();
  const { data: home } = useHome();

  const weeks = planWeeks();
  const range = planRange();
  // Hela intervallet i en fråga, samma nyckel som planeringsarket i Recept
  // och hemsidan: veckoväljarens räknare behöver alla veckor, och att bläddra
  // blir gratis.
  const meals = usePlannedMeals(range.from, range.to);
  const visibleSlots = useVisibleSlots();
  const deleteMeal = useDeletePlannedMeal();
  const generate = useGenerateShoppingList();

  const [scrolled, setScrolled] = useState(false);
  const [date, setDate] = useState<IsoDate>(today());
  // Sheet hålls kvar medan isSheetOpen är false, så formuläret syns medan
  // arket animeras ut.
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const addSheet = sheet?.kind === "add" ? sheet : null;
  const servingsSheet = sheet?.kind === "servings" ? sheet : null;
  const swapSheet = sheet?.kind === "swap" ? sheet : null;
  const moveSheet = sheet?.kind === "move" ? sheet : null;

  const weekStart = weekMonday(date);
  const isToday = date === today();
  // Passerade dagar går att titta på men inte ändra (plan_meal nekar dem).
  const isEditable = date >= today();

  const slots = visibleSlots.data ?? [];
  const grouped = groupMeals(meals.data ?? [], slots);
  const mealsIn = (slot: MealSlot) => grouped.byMeal[mealKey(date, slot)] ?? [];
  // Hemmets synliga måltider, plus en dold om den ändå har något den dagen —
  // t.ex. från en stående måltid som lades upp innan måltiden doldes.
  const daySlots = sortSlots([
    ...new Set([
      ...slots,
      ...MEAL_SLOTS.filter((slot) => mealsIn(slot).length > 0),
    ]),
  ]);

  // Swipe byter dag inom planeringsintervallet. Gesten sitter bara på dagens
  // innehåll, så väljarna ovanför och vertikal scroll/pull-to-refresh störs inte.
  // Dagbytet är en "shared axis X"-övergång: gamla dagen glider en bit och tonar
  // ut, den nya glider in från motsatt sida och tonar in.
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  // Riktningen på ett pågående byte, så effekten nedan vet från vilken sida
  // den nya dagen ska glida in.
  const pendingDirection = useSharedValue<1 | -1 | 0>(0);
  const inRange = (day: IsoDate) => day >= range.from && day <= range.to;
  const commitSwipe = (direction: 1 | -1) => {
    pendingDirection.set(direction);
    setDate(addDays(date, direction));
  };
  // Gamla dagen fortsätter från där fingret är och tonar ut; setDate körs först
  // i animationens callback (UI-tråden, därför scheduleOnRN).
  const swipeTo = (direction: 1 | -1) => {
    if (!inRange(addDays(date, direction))) return false;
    opacity.set(withTiming(0, { duration: OUT_DURATION }));
    translateX.set(
      withTiming(
        translateX.get() - direction * SLIDE_DISTANCE,
        { duration: OUT_DURATION },
        (finished) => {
          if (finished) scheduleOnRN(commitSwipe, direction);
        },
      ),
    );
    return true;
  };
  // Tryck i dag- eller veckoväljaren: samma in-animation som efter ett svep.
  const selectDate = (next: IsoDate) => {
    if (next === date) return;
    pendingDirection.set(next > date ? 1 : -1);
    setDate(next);
  };
  // Nya dagens innehåll är renderat när effekten körs. Tills dess ligger det
  // kvar osynligt efter ett svep (opacity 0), så inget blinkar.
  useEffect(() => {
    const direction = pendingDirection.get();
    if (direction === 0) return;
    pendingDirection.set(0);
    translateX.set(direction * SLIDE_DISTANCE);
    opacity.set(0);
    const config = { duration: IN_DURATION, easing: Easing.out(Easing.cubic) };
    translateX.set(withTiming(0, config));
    opacity.set(withTiming(1, config));
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      const next = addDays(date, e.translationX < 0 ? 1 : -1);
      // Längst ut dras innehållet bara lite och fjädrar tillbaka.
      const x = inRange(next) ? e.translationX : e.translationX * 0.2;
      translateX.set(x);
      // Tonar från 1 till 0.6 vid tröskeln.
      opacity.set(1 - 0.4 * Math.min(Math.abs(x) / SWIPE_DISTANCE, 1));
    })
    .onEnd((e) => {
      const direction = e.translationX < 0 ? 1 : -1;
      if (Math.abs(e.translationX) < SWIPE_DISTANCE || !swipeTo(direction)) {
        translateX.set(withSpring(0));
        opacity.set(withTiming(1, { duration: IN_DURATION }));
      }
    });
  const swipeStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: translateX.get() }],
  }));

  const openSheet = (next: Sheet) => {
    setSheet(next);
    setIsSheetOpen(true);
  };
  const closeSheet = () => setIsSheetOpen(false);

  // Samma skäl som i receptlistan: isRefetching är sant även vid
  // bakgrundsuppdateringar, och då hade spinnern dykt upp oombedd.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([meals.refetch(), visibleSlots.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const onAction = (meal: PlannedMeal, action: PlannedMealAction) => {
    if (action === "delete") {
      Alert.alert(
        `Ta bort ${meal.recipeName}?`,
        "Måltiden försvinner från veckoplanen.",
        [
          { text: "Avbryt", style: "cancel" },
          {
            text: "Ta bort",
            style: "destructive",
            onPress: () => deleteMeal.mutate(meal.id),
          },
        ],
      );
      return;
    }
    openSheet({ kind: action, meal, key: Date.now() });
  };

  const generateList = () => {
    if (!home) return;
    generate.mutate(
      { homeId: home.id, weekStart },
      {
        onSuccess: () =>
          router.navigate({
            pathname: "/(authorized)/(shopping-list)",
            params: { week: weekStart },
          }),
      },
    );
  };

  const isLoading = meals.isPending || visibleSlots.isPending;
  const loadFailed = meals.isError || visibleSlots.isError;

  return (
    <View className="flex-1 pt-safe-offset-2">
      <HomeTopBar title="Veckoplan" scrolled={scrolled} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      ) : loadFailed ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Typography.Paragraph align="center" color="muted">
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
        <ScrollView
          contentContainerClassName="gap-4 px-4 pt-2 pb-28"
          scrollEventThrottle={16}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
        >
          <WeekPicker
            value={weekStart}
            onChange={(monday) => selectDate(sameWeekdayIn(monday, date))}
            weeks={weeks}
            filledByWeek={grouped.filledByWeek}
            capacity={7 * slots.length}
            footer={`Du kan planera upp till ${PLAN_WEEKS_AHEAD} veckor framåt.`}
          />

          <DayPicker
            weekStart={weekStart}
            value={date}
            onChange={selectDate}
            slots={slots}
            filledByDate={grouped.filledByDate}
          />

          <GestureDetector gesture={swipe}>
            <Animated.View className="gap-4" style={swipeStyle}>
              <View className="flex-row items-center gap-2 pt-2">
                <Typography.Heading type="h4" weight="bold">
                  {capitalize(weekdayLong(date))}
                </Typography.Heading>
                {isToday && (
                  <Chip size="sm" variant="soft" color="success">
                    <Chip.Label>Idag</Chip.Label>
                  </Chip>
                )}
              </View>

              <FieldError isInvalid={!!deleteMeal.error}>
                Kunde inte ta bort måltiden
              </FieldError>

              {daySlots.map((slot) => (
                <MealSlotSection
                  key={slot}
                  slot={slot}
                  meals={mealsIn(slot)}
                  isEditable={isEditable}
                  onAdd={() =>
                    openSheet({ kind: "add", slot, key: Date.now() })
                  }
                  onOpenRecipe={(meal) =>
                    router.push({
                      pathname: "/recipe/[id]",
                      params: { id: meal.recipeId, scope: "home" },
                    })
                  }
                  onAction={onAction}
                  deletingId={
                    deleteMeal.isPending ? deleteMeal.variables : undefined
                  }
                />
              ))}
            </Animated.View>
          </GestureDetector>

          <View className="gap-2 pt-2">
            <FieldError isInvalid={!!generate.error}>
              {generate.error?.code === "P0001"
                ? generate.error.message
                : "Kunde inte generera inköpslistan"}
            </FieldError>
            <Button
              size="lg"
              isDisabled={!home || generate.isPending}
              onPress={generateList}
            >
              <StyledIonicons
                name="cart-outline"
                size={20}
                className="text-accent-foreground"
              />
              <Button.Label>
                {generate.isPending ? "Genererar…" : "Generera inköpslista"}
              </Button.Label>
            </Button>
          </View>
        </ScrollView>
      )}

      {isEditable && (
        <Fab
          accessibilityLabel="Lägg till måltid"
          onPress={() => openSheet({ kind: "add", slot: null, key: Date.now() })}
        />
      )}

      <AddMealSheet
        date={date}
        initialSlot={addSheet?.slot ?? null}
        formKey={addSheet?.key ?? null}
        slots={slots}
        byMeal={grouped.byMeal}
        isOpen={isSheetOpen && !!addSheet}
        onClose={closeSheet}
      />
      <ServingsSheet
        meal={servingsSheet?.meal ?? null}
        formKey={servingsSheet?.key ?? null}
        isOpen={isSheetOpen && !!servingsSheet}
        onClose={closeSheet}
      />
      <SwapRecipeSheet
        meal={swapSheet?.meal ?? null}
        formKey={swapSheet?.key ?? null}
        isOpen={isSheetOpen && !!swapSheet}
        onClose={closeSheet}
      />
      <MoveMealSheet
        meal={moveSheet?.meal ?? null}
        formKey={moveSheet?.key ?? null}
        slots={slots}
        grouped={grouped}
        isOpen={isSheetOpen && !!moveSheet}
        onClose={closeSheet}
      />
    </View>
  );
};

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default PlanScreen;
