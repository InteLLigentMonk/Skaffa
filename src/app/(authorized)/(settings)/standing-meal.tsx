import NumberSelect from "@/components/number-select";
import RecipePicker from "@/features/plan/components/recipe-picker";
import {
  useDeleteStandingMeal,
  useSaveStandingMeal,
  useStandingMeals,
  useVisibleSlots,
} from "@/features/plan/hooks/use-plan";
import {
  IsoWeekday,
  matchesPreset,
  MEAL_SLOT_LABELS,
  MealSlot,
  sortSlots,
  StandingMeal,
  WEEKDAY_PRESETS,
  WEEKDAYS,
} from "@/features/plan/plan-types";
import { getRecipe } from "@/features/recipes/api";
import { recipeKeys } from "@/features/recipes/hooks/use-recipes";
import { skipToken, useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  Button,
  Chip,
  FieldError,
  Label,
  Spinner,
  Surface,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

const errorText = (
  error: { code?: string; message: string } | null,
  fallback: string,
) => {
  if (!error) return null;
  // raise exception i migrationerna är skrivna för att visas rakt upp.
  return error.code === "P0001" ? error.message : fallback;
};

const defaultSlot = (slots: MealSlot[]): MealSlot | null =>
  slots.includes("middag") ? "middag" : (slots[0] ?? null);

// Laddningen ligger här och formuläret i en egen komponent, så formulärets
// useState kan initieras från regeln en gång när den väl finns.
const StandingMealScreen = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const standing = useStandingMeals();
  const rule = id ? standing.data?.find((r) => r.id === id) : undefined;

  const title = id ? "Ändra stående måltid" : "Ny stående måltid";

  if (id && standing.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <Stack.Screen options={{ title }} />
        <Spinner />
      </View>
    );
  }

  // Före "finns inte längre": utan data vet vi inte om den finns.
  if (id && standing.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Stack.Screen options={{ title }} />
        <Typography.Paragraph color="muted" align="center">
          Kunde inte hämta den stående måltiden.
        </Typography.Paragraph>
        <Button variant="secondary" onPress={() => standing.refetch()}>
          <Button.Label>Försök igen</Button.Label>
        </Button>
      </View>
    );
  }

  // Borttagen av någon annan i hemmet medan listan var öppen.
  if (id && !rule) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Stack.Screen options={{ title }} />
        <Typography.Paragraph color="muted" align="center">
          Den stående måltiden finns inte längre.
        </Typography.Paragraph>
        <Button variant="secondary" onPress={() => router.back()}>
          <Button.Label>Tillbaka</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <StandingMealForm initial={rule} />
    </>
  );
};

const StandingMealForm = ({ initial }: { initial?: StandingMeal }) => {
  const visibleSlots = useVisibleSlots();
  const save = useSaveStandingMeal();
  const remove = useDeleteStandingMeal();

  const [recipe, setRecipe] = useState(
    initial ? { id: initial.recipeId, name: initial.recipeName } : null,
  );
  const [isPicking, setIsPicking] = useState(!initial);
  const [pickedSlot, setPickedSlot] = useState<MealSlot | null>(
    initial?.slot ?? null,
  );
  const [weekdays, setWeekdays] = useState<IsoWeekday[]>(
    initial?.weekdays ?? [],
  );
  const [pickedServings, setPickedServings] = useState<number | null>(
    initial?.servings ?? null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Samma nyckel och funktion som useRecipe, så receptsidans cache delas.
  // Bara för att föreslå receptets egna portioner.
  const recipeDetail = useQuery({
    queryKey: recipeKeys.detail("home", recipe?.id ?? ""),
    queryFn: recipe ? () => getRecipe("home", recipe.id) : skipToken,
  });

  // En regel i en måltid hemmet sedan dolt ska ändå gå att se och behålla.
  const slots = sortSlots([
    ...new Set([
      ...(visibleSlots.data ?? []),
      ...(initial ? [initial.slot] : []),
    ]),
  ]);
  // Förvalen räknas fram tills användaren valt själv, som i planeringsarket.
  const slot = pickedSlot ?? defaultSlot(slots);
  const servings = pickedServings ?? recipeDetail.data?.servings ?? 4;

  const toggleDay = (day: IsoWeekday) =>
    setWeekdays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );

  const canSave =
    !!recipe && !!slot && weekdays.length > 0 && !save.isPending;

  const submit = () => {
    if (!recipe || !slot) return;
    save.mutate(
      {
        id: initial?.id ?? null,
        recipeId: recipe.id,
        slot,
        weekdays: [...weekdays].sort(),
        servings,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScrollView
      contentContainerClassName="grow gap-6 px-4 py-6"
      keyboardShouldPersistTaps="handled"
    >
      {/* ---- Recept ---- */}
      <View className="gap-2">
        <Label>Recept</Label>
        {isPicking ? (
          <>
            <RecipePicker
              onPick={(picked) => {
                setRecipe({ id: picked.id, name: picked.name });
                // Nytt recept = nya portioner att föreslå.
                setPickedServings(null);
                setIsPicking(false);
              }}
            />
            {recipe && (
              <Button variant="ghost" onPress={() => setIsPicking(false)}>
                <Button.Label>Behåll {recipe.name}</Button.Label>
              </Button>
            )}
          </>
        ) : (
          <Surface className="flex-row items-center justify-between gap-2">
            <Typography.Heading type="h5" className="flex-1">
              {recipe?.name}
            </Typography.Heading>
            <Button
              variant="tertiary"
              size="sm"
              className="rounded-xl bg-field"
              onPress={() => setIsPicking(true)}
            >
              <Button.Label>Byt</Button.Label>
            </Button>
          </Surface>
        )}
      </View>

      {/* ---- Måltid ---- */}
      <View className="gap-2">
        <Label>Måltid</Label>
        <View className="flex-row flex-wrap gap-2">
          {slots.map((s) => {
            const isSelected = s === slot;
            return (
              <Chip
                key={s}
                size="lg"
                variant={isSelected ? "soft" : "secondary"}
                color={isSelected ? "accent" : "default"}
                onPress={() => setPickedSlot(s)}
                accessibilityState={{ selected: isSelected }}
              >
                <Chip.Label>{MEAL_SLOT_LABELS[s]}</Chip.Label>
              </Chip>
            );
          })}
        </View>
      </View>

      {/* ---- Dagar ---- */}
      <View className="gap-2">
        <Label>Dagar</Label>
        <View className="flex-row flex-wrap gap-2">
          {WEEKDAY_PRESETS.map((preset) => {
            const isSelected = matchesPreset(weekdays, preset.days);
            return (
              <Chip
                key={preset.label}
                variant={isSelected ? "soft" : "secondary"}
                color={isSelected ? "accent" : "default"}
                onPress={() => setWeekdays(preset.days)}
                accessibilityState={{ selected: isSelected }}
              >
                <Chip.Label>{preset.label}</Chip.Label>
              </Chip>
            );
          })}
        </View>
        {/* Egna knappar i stället för Chip: sju i bredd ger runt 43 px var på
            en smal telefon, och Chips padding-inline går inte att skriva över
            med px-0 — "Mån" bröts eller blev "…". Samma färger som Chip. */}
        <View className="flex-row gap-1">
          {WEEKDAYS.map(({ day, short }) => {
            const isSelected = weekdays.includes(day);
            return (
              <Pressable
                key={day}
                className={`h-10 flex-1 items-center justify-center rounded-3xl ${isSelected ? "bg-accent-soft" : "bg-default"}`}
                onPress={() => toggleDay(day)}
                accessibilityRole="button"
                accessibilityLabel={short}
                accessibilityState={{ selected: isSelected }}
              >
                <Typography.Paragraph
                  type="body-sm"
                  numberOfLines={1}
                  className={
                    isSelected
                      ? "text-accent-soft-foreground"
                      : "text-default-soft-foreground"
                  }
                >
                  {short}
                </Typography.Paragraph>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ---- Portioner ---- */}
      <View className="flex-row items-center justify-between rounded-2xl bg-surface-secondary p-3">
        <View>
          <Typography.Paragraph weight="semibold">Portioner</Typography.Paragraph>
          <Typography.Paragraph type="body-xs" color="muted">
            Per tillfälle
          </Typography.Paragraph>
        </View>
        <NumberSelect value={servings} onChange={setPickedServings} />
      </View>

      <Typography.Paragraph type="body-sm" color="muted">
        Läggs in från i dag och framåt. Ändrar eller tar du bort den här
        senare försvinner kommande tillfällen ur veckoplanen.
      </Typography.Paragraph>

      <FieldError isInvalid={!!save.error}>
        {errorText(save.error, "Kunde inte spara")}
      </FieldError>

      <Button size="lg" isDisabled={!canSave} onPress={submit}>
        <Button.Label>
          {save.isPending ? "Sparar…" : initial ? "Spara ändringar" : "Lägg till"}
        </Button.Label>
      </Button>

      {/* ---- Ta bort ---- */}
      {initial && (
        <View className="gap-2">
          <FieldError isInvalid={!!remove.error}>
            {errorText(remove.error, "Kunde inte ta bort")}
          </FieldError>
          {!confirmDelete ? (
            <Button
              variant="tertiary"
              className="rounded-2xl bg-danger-soft"
              onPress={() => setConfirmDelete(true)}
            >
              <Typography.Paragraph className="text-danger">
                Ta bort stående måltid
              </Typography.Paragraph>
            </Button>
          ) : (
            <View className="gap-2">
              <Typography.Paragraph type="body-sm" color="muted">
                Kommande tillfällen av {initial.recipeName} tas också bort ur
                veckoplanen.
              </Typography.Paragraph>
              <View className="flex-row gap-2">
                <Button
                  variant="tertiary"
                  className="flex-1 rounded-2xl bg-field"
                  onPress={() => {
                    setConfirmDelete(false);
                    remove.reset();
                  }}
                >
                  <Typography.Paragraph>Avbryt</Typography.Paragraph>
                </Button>
                <Button
                  variant="tertiary"
                  className="flex-1 rounded-2xl bg-danger-soft"
                  isDisabled={remove.isPending}
                  onPress={() =>
                    remove.mutate(initial.id, {
                      onSuccess: () => router.back(),
                    })
                  }
                >
                  <Typography.Paragraph className="text-danger">
                    {remove.isPending ? "Tar bort…" : "Ta bort"}
                  </Typography.Paragraph>
                </Button>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default StandingMealScreen;
