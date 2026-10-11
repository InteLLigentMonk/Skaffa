import { useSheetOpen } from "@/hooks/use-sheet-open";
import NumberSelect from "@/components/number-select";
import { useRecipe } from "@/features/recipes/hooks/use-recipes";
import { formatDayLong, IsoDate } from "@/lib/dates";
import {
  BottomSheet,
  Button,
  FieldError,
  Spinner,
  Surface,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { usePlanRecipe } from "../hooks/use-plan";
import { GroupedMeals, mealKey, MealSlot, sortSlots } from "../plan-types";
import MealConflictAlert, { ConflictChoice } from "./meal-conflict-alert";
import RecipePicker from "./recipe-picker";
import SlotChips from "./slot-chips";

type PickedRecipe = { id: string; name: string };

type Props = {
  date: IsoDate;
  /** Förvald måltid (från ett tomt fält); null = FAB:en. */
  initialSlot: MealSlot | null;
  /** Hemmets synliga måltider. */
  slots: MealSlot[];
  byMeal: GroupedMeals["byMeal"];
  isOpen: boolean;
  onClose: () => void;
};

const defaultSlot = (slots: MealSlot[]): MealSlot | null =>
  slots.includes("middag") ? "middag" : (slots[0] ?? null);

// Två steg i samma ark: först receptet, sedan måltid och portioner. Dagen är
// den man står på i veckoplanen. Arket monteras om för varje öppning (key i
// skärmen), så det börjar alltid på steg ett.
const AddMealSheet = ({
  date,
  initialSlot,
  slots,
  byMeal,
  isOpen,
  onClose,
}: Props) => {
  // Se use-sheet-open: arket monteras ofta redan öppet.
  const sheetOpen = useSheetOpen(isOpen);
  const [recipe, setRecipe] = useState<PickedRecipe | null>(null);

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
              <BottomSheet.Title>Lägg till måltid</BottomSheet.Title>
              <BottomSheet.Description>
                {capitalize(formatDayLong(date))}
              </BottomSheet.Description>
            </View>

            {recipe ? (
              <MealDetails
                // Nytt recept = nya portioner att föreslå.
                key={recipe.id}
                recipe={recipe}
                date={date}
                initialSlot={initialSlot}
                slots={slots}
                byMeal={byMeal}
                onChangeRecipe={() => setRecipe(null)}
                onDone={onClose}
              />
            ) : (
              <RecipePicker onPick={setRecipe} />
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

// Eget komponent så receptets portioner kan hämtas med useRecipe utan ett
// villkorat hook-anrop. Samma nyckel som receptsidan, så den är ofta cachad.
const MealDetails = ({
  recipe,
  date,
  initialSlot,
  slots: visibleSlots,
  byMeal,
  onChangeRecipe,
  onDone,
}: {
  recipe: PickedRecipe;
  date: IsoDate;
  initialSlot: MealSlot | null;
  slots: MealSlot[];
  byMeal: GroupedMeals["byMeal"];
  onChangeRecipe: () => void;
  onDone: () => void;
}) => {
  const detail = useRecipe("home", recipe.id);
  const plan = usePlanRecipe();

  const [pickedSlot, setPickedSlot] = useState<MealSlot | null>(initialSlot);
  const [pickedServings, setPickedServings] = useState<number | null>(null);
  const [choice, setChoice] = useState<ConflictChoice | null>(null);

  const slots = sortSlots([
    ...new Set([...visibleSlots, ...(initialSlot ? [initialSlot] : [])]),
  ]);
  const slot = pickedSlot ?? defaultSlot(slots);
  const servings = pickedServings ?? detail.data?.servings ?? null;

  const inSlot = slot ? (byMeal[mealKey(date, slot)] ?? []) : [];
  const others = inSlot.filter((meal) => meal.recipeId !== recipe.id);
  const alreadyPlanned = inSlot.length > others.length;
  const hasConflict = others.length > 0;

  const isBlocked = hasConflict && choice === null;
  const submitLabel = isBlocked
    ? "Välj hur ovan för att fortsätta"
    : alreadyPlanned && !hasConflict
      ? "Uppdatera portioner"
      : "Lägg till";

  const submit = () => {
    if (!slot || servings === null) return;
    plan.mutate(
      {
        recipeId: recipe.id,
        scope: "home",
        date,
        slot,
        servings,
        replace: choice === "replace",
      },
      { onSuccess: onDone },
    );
  };

  return (
    <>
      <Surface
        variant="secondary"
        className="flex-row items-center justify-between gap-2 rounded-2xl p-3"
      >
        <Typography.Heading type="h6" weight="bold" className="flex-1">
          {recipe.name}
        </Typography.Heading>
        <Button
          variant="tertiary"
          size="sm"
          className="rounded-xl bg-field"
          onPress={onChangeRecipe}
        >
          <Button.Label>Byt</Button.Label>
        </Button>
      </Surface>

      <View className="gap-2">
        <Typography.Paragraph type="body-sm" weight="semibold">
          Vilken måltid?
        </Typography.Paragraph>
        <SlotChips
          slots={slots}
          value={slot}
          onChange={(s) => {
            setPickedSlot(s);
            setChoice(null);
          }}
          isTaken={(s) => (byMeal[mealKey(date, s)]?.length ?? 0) > 0}
        />
      </View>

      {hasConflict && slot && (
        <MealConflictAlert
          date={date}
          slot={slot}
          otherNames={others.map((meal) => meal.recipeName)}
          choice={choice}
          onChoiceChange={setChoice}
        />
      )}

      <View className="flex-row items-center justify-between rounded-2xl bg-surface-secondary p-3">
        <View>
          <Typography.Paragraph weight="semibold">Portioner</Typography.Paragraph>
          <Typography.Paragraph type="body-xs" color="muted">
            Förvalt från receptet
          </Typography.Paragraph>
        </View>
        {servings === null ? (
          <Spinner />
        ) : (
          <NumberSelect value={servings} onChange={setPickedServings} />
        )}
      </View>

      <FieldError isInvalid={!!plan.error}>
        {plan.error?.code === "P0001"
          ? plan.error.message
          : "Kunde inte lägga till i veckoplanen"}
      </FieldError>

      <Button
        size="lg"
        isDisabled={isBlocked || !slot || servings === null || plan.isPending}
        onPress={submit}
      >
        <Button.Label>
          {plan.isPending ? "Lägger till…" : submitLabel}
        </Button.Label>
      </Button>
    </>
  );
};

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default AddMealSheet;
