import { useHome } from "@/features/home/hooks/use-home";
import AmountField from "@/features/ingredients/components/amount-field";
import Category from "@/features/ingredients/components/category";
import IngredientSearch from "@/features/ingredients/components/ingredient-search";
import NewIngredientForm from "@/features/ingredients/components/new-ingredient-form";
import {
  CATEGORY_LABELS,
  PickerIngredient,
} from "@/features/ingredients/ingredient-types";
import {
  useDeleteRecurringItem,
  useRecurringItems,
  useSaveRecurringItem,
} from "@/features/shopping-list/hooks/use-shopping-list";
import { RecurringItem } from "@/features/shopping-list/shopping-list-types";
import {
  DEFAULT_UNIT,
  formatAmount,
  formatNumber,
  isValidAmount,
  parseAmount,
  toBase,
  UnitCode,
  unitsFor,
} from "@/lib/units";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  Button,
  FieldError,
  Label,
  Spinner,
  Surface,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useHeaderHeight } from "expo-router/build/react-navigation";

// Se kommentaren vid keyboardBehavior i manage-home.tsx.
const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

// Laddningen här, formuläret i en egen komponent som initieras en gång från
// varan — samma uppdelning som standing-meal.tsx.
const RecurringItemScreen = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recurring = useRecurringItems();
  const item = id ? recurring.data?.find((r) => r.id === id) : undefined;

  const title = id ? "Ändra vara" : "Ny återkommande vara";

  if (id && recurring.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <Stack.Screen options={{ title }} />
        <Spinner />
      </View>
    );
  }

  // Före "finns inte längre": utan data vet vi inte om den finns.
  if (id && recurring.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Stack.Screen options={{ title }} />
        <Typography.Paragraph color="muted" align="center">
          Kunde inte hämta varan.
        </Typography.Paragraph>
        <Button variant="secondary" onPress={() => recurring.refetch()}>
          <Button.Label>Försök igen</Button.Label>
        </Button>
      </View>
    );
  }

  // Borttagen av någon annan i hemmet medan listan var öppen.
  if (id && !item) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Stack.Screen options={{ title }} />
        <Typography.Paragraph color="muted" align="center">
          Varan finns inte längre.
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
      <RecurringItemForm
        initial={item}
        // Ingredienser som redan är återkommande varor, utom den som ändras.
        takenIds={
          new Set(
            (recurring.data ?? [])
              .filter((r) => r.id !== item?.id)
              .map((r) => r.ingredient.id),
          )
        }
      />
    </>
  );
};

// Mängden som den visas när formuläret öppnas: största runda enheten, så
// 2000 g blir "2 kg" — samma som i listan.
const initialAmount = (item?: RecurringItem) => {
  if (!item?.amountBase) return null;
  const { value, unit } = formatAmount(
    item.amountBase,
    item.ingredient.dimension,
  );
  return { text: formatNumber(value), unit };
};

const RecurringItemForm = ({
  initial,
  takenIds,
}: {
  initial?: RecurringItem;
  takenIds: Set<string>;
}) => {
  const { data: home } = useHome();
  const save = useSaveRecurringItem();
  const remove = useDeleteRecurringItem();
  const headerHeight = useHeaderHeight();

  const [ingredient, setIngredient] = useState<PickerIngredient | null>(
    initial?.ingredient ?? null,
  );
  const [isPicking, setIsPicking] = useState(!initial);
  // Namnet från sökrutan när man valt "Skapa …"; null = inte i skapa-läget.
  const [createName, setCreateName] = useState<string | null>(null);
  const [amountText, setAmountText] = useState(
    initialAmount(initial)?.text ?? "",
  );
  const [pickedUnit, setPickedUnit] = useState<UnitCode | null>(
    initialAmount(initial)?.unit ?? null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pick = (picked: PickerIngredient) => {
    setIngredient(picked);
    // Ny ingrediens kan ha ett annat måttslag; enheten väljs om.
    setPickedUnit(null);
    setIsPicking(false);
    setCreateName(null);
  };

  // Ny ingrediens visas i stället för resten av formuläret: den behöver hela
  // höjden, och man kommer tillbaka hit med den förvald.
  if (createName !== null) {
    return (
      <KeyboardAvoidingView
        behavior={keyboardBehavior}
        keyboardVerticalOffset={headerHeight}
        className="flex-1"
      >
        <View className="flex-1 gap-4 px-4 pt-4 pb-safe-offset-4">
          <View className="flex-row items-center justify-between">
            <Typography.Heading type="h4">Ny ingrediens</Typography.Heading>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setCreateName(null)}
            >
              <Button.Label>Avbryt</Button.Label>
            </Button>
          </View>
          <NewIngredientForm
            initialName={createName}
            onCreated={pick}
            allowHousehold
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  const units = ingredient
    ? unitsFor(ingredient.dimension, ingredient.density_g_per_ml)
    : [];
  const unit =
    pickedUnit && units.includes(pickedUnit)
      ? pickedUnit
      : ingredient
        ? DEFAULT_UNIT[ingredient.dimension]
        : null;

  const hasAmount = amountText.trim().length > 0;
  const amountInvalid = hasAmount && !isValidAmount(amountText);
  const canSave = !!ingredient && !amountInvalid && !save.isPending && !!home;

  const submit = () => {
    if (!ingredient || !home || !unit) return;
    const amountBase = hasAmount
      ? toBase(
          parseAmount(amountText),
          unit,
          ingredient.dimension,
          ingredient.density_g_per_ml,
        )
      : null;

    save.mutate(
      { id: initial?.id ?? null, homeId: home.id, ingredient, amountBase },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      keyboardVerticalOffset={headerHeight}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="grow gap-6 px-4 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- Vara ---- */}
        <View className="gap-2">
          <Label>Vara</Label>
          {isPicking ? (
            <>
              <IngredientSearch
                takenIds={takenIds}
                takenLabel="Redan en återkommande vara"
                onPick={pick}
                onCreate={setCreateName}
              />
              {ingredient && (
                <Button variant="ghost" onPress={() => setIsPicking(false)}>
                  <Button.Label>Behåll {ingredient.name}</Button.Label>
                </Button>
              )}
            </>
          ) : (
            ingredient && (
              <Surface className="flex-row items-center gap-3">
                <Category category={ingredient.category} />
                <View className="flex-1">
                  <Typography.Heading type="h5">
                    {ingredient.name}
                  </Typography.Heading>
                  <Typography.Paragraph type="body-xs" color="muted">
                    {CATEGORY_LABELS[ingredient.category]}
                  </Typography.Paragraph>
                </View>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="rounded-xl bg-field"
                  onPress={() => setIsPicking(true)}
                >
                  <Button.Label>Byt</Button.Label>
                </Button>
              </Surface>
            )
          )}
        </View>

        {/* ---- Mängd ---- */}
        {ingredient && !isPicking && (
          <AmountField
            value={amountText}
            onChange={setAmountText}
            units={units}
            unit={unit}
            onUnitChange={setPickedUnit}
            isInvalid={amountInvalid}
            hint="Utan mängd hamnar varan på listan som en påminnelse."
          />
        )}

        <FieldError isInvalid={!!save.error}>
          Kunde inte spara. Försök igen.
        </FieldError>

        <Button size="lg" isDisabled={!canSave} onPress={submit}>
          <Button.Label>
            {save.isPending
              ? "Sparar…"
              : initial
                ? "Spara ändringar"
                : "Lägg till"}
          </Button.Label>
        </Button>

        {/* ---- Ta bort ---- */}
        {initial && home && (
          <View className="gap-2">
            <FieldError isInvalid={!!remove.error}>
              Kunde inte ta bort. Försök igen.
            </FieldError>
            {!confirmDelete ? (
              <Button
                variant="tertiary"
                className="rounded-2xl bg-danger-soft"
                onPress={() => setConfirmDelete(true)}
              >
                <Typography.Paragraph className="text-danger">
                  Ta bort återkommande vara
                </Typography.Paragraph>
              </Button>
            ) : (
              <View className="gap-2">
                <Typography.Paragraph type="body-sm" color="muted">
                  {initial.ingredient.name} läggs inte längre på nya listor.
                  Står den redan på veckans lista ligger den kvar där.
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
                      remove.mutate(
                        { id: initial.id, homeId: home.id },
                        { onSuccess: () => router.back() },
                      )
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
    </KeyboardAvoidingView>
  );
};


export default RecurringItemScreen;
