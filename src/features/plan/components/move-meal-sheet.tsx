import { useSheetOpen } from "@/hooks/use-sheet-open";
import { formatDayLong, IsoDate, today, weekMonday } from "@/lib/dates";
import { BottomSheet, Button, FieldError, Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useUpdatePlannedMeal } from "../hooks/use-plan";
import {
  GroupedMeals,
  mealKey,
  MealSlot,
  PLAN_WEEKS_AHEAD,
  PlannedMeal,
  planWeeks,
  sameWeekdayIn,
  sortSlots,
} from "../plan-types";
import DayPicker from "./day-picker";
import MealConflictAlert, { ConflictChoice } from "./meal-conflict-alert";
import SlotChips from "./slot-chips";
import WeekPicker from "./week-picker";

type Props = {
  meal: PlannedMeal;
  /** Hemmets synliga måltider. */
  slots: MealSlot[];
  grouped: GroupedMeals;
  isOpen: boolean;
  onClose: () => void;
};

const MoveMealSheet = ({
  meal,
  slots: visibleSlots,
  grouped,
  isOpen,
  onClose,
}: Props) => {
  // Se use-sheet-open: arket monteras ofta redan öppet.
  const sheetOpen = useSheetOpen(isOpen);
  const update = useUpdatePlannedMeal();

  const [date, setDate] = useState<IsoDate>(meal.date);
  const [slot, setSlot] = useState<MealSlot>(meal.slot);
  const [choice, setChoice] = useState<ConflictChoice | null>(null);

  // Måltidens egen måltid ska gå att välja även om hemmet dolt den.
  const slots = sortSlots([...new Set([...visibleSlots, meal.slot])]);

  const isSamePlace = date === meal.date && slot === meal.slot;
  // Raden själv räknas inte, och inte heller samma recept: det slås ihop.
  const others = (grouped.byMeal[mealKey(date, slot)] ?? []).filter(
    (m) => m.id !== meal.id && m.recipeId !== meal.recipeId,
  );
  const hasConflict = !isSamePlace && others.length > 0;
  const isBlocked = hasConflict && choice === null;

  const submit = () =>
    update.mutate(
      {
        id: meal.id,
        recipeId: meal.recipeId,
        date,
        slot,
        servings: meal.servings,
        replace: choice === "replace",
      },
      { onSuccess: onClose },
    );

  return (
    <BottomSheet
      isOpen={sheetOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-4">
            <View>
              <BottomSheet.Title>Flytta måltid</BottomSheet.Title>
              <BottomSheet.Description>
                {meal.recipeName} · {meal.servings} portioner
              </BottomSheet.Description>
            </View>

            <WeekPicker
              value={weekMonday(date)}
              onChange={(monday) => {
                setDate(sameWeekdayIn(monday, date));
                setChoice(null);
              }}
              weeks={planWeeks()}
              filledByWeek={grouped.filledByWeek}
              capacity={7 * visibleSlots.length}
              footer={`Du kan planera upp till ${PLAN_WEEKS_AHEAD} veckor framåt.`}
            />

            <View className="gap-2">
              <Typography.Paragraph type="body-sm" weight="semibold">
                Vilken dag?
              </Typography.Paragraph>
              <DayPicker
                weekStart={weekMonday(date)}
                value={date}
                onChange={(next) => {
                  setDate(next);
                  setChoice(null);
                }}
                slots={visibleSlots}
                filledByDate={grouped.filledByDate}
                highlightSlot={slot}
                isDateDisabled={(d) => d < today()}
              />
            </View>

            <View className="gap-2">
              <Typography.Paragraph type="body-sm" weight="semibold">
                Vilken måltid?
              </Typography.Paragraph>
              <SlotChips
                slots={slots}
                value={slot}
                onChange={(s) => {
                  setSlot(s);
                  setChoice(null);
                }}
                isTaken={(s) =>
                  (grouped.byMeal[mealKey(date, s)] ?? []).some(
                    (m) => m.id !== meal.id,
                  )
                }
              />
            </View>

            {hasConflict && (
              <MealConflictAlert
                date={date}
                slot={slot}
                otherNames={others.map((m) => m.recipeName)}
                choice={choice}
                onChoiceChange={setChoice}
              />
            )}

            <FieldError isInvalid={!!update.error}>
              {update.error?.code === "P0001"
                ? update.error.message
                : "Kunde inte flytta måltiden"}
            </FieldError>

            <Button
              size="lg"
              isDisabled={isSamePlace || isBlocked || update.isPending}
              onPress={submit}
            >
              <Button.Label>
                {update.isPending
                  ? "Flyttar…"
                  : isSamePlace
                    ? "Välj en annan dag eller måltid"
                    : isBlocked
                      ? "Välj hur ovan för att fortsätta"
                      : `Flytta till ${formatDayLong(date)}`}
              </Button.Label>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

export default MoveMealSheet;
