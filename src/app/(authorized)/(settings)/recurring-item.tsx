import SearchBar from "@/components/search-bar";
import { useHome } from "@/features/home/hooks/use-home";
import Category from "@/features/ingredients/components/category";
import NewIngredientForm from "@/features/ingredients/components/new-ingredient-form";
import { useIngredients } from "@/features/ingredients/hooks/use-ingredients";
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
  UNIT_LABELS,
  UnitCode,
  unitsFor,
} from "@/lib/units";
import { StyledIonicons } from "@/utils/helpers";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  ListGroup,
  Separator,
  Spinner,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { Fragment, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useHeaderHeight } from "expo-router/build/react-navigation";

// Få nog att mängdfälten syns under listan utan att man scrollar.
const MAX_SHOWN = 6;

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
          <View className="gap-2">
            <Label>Mängd (valfri)</Label>
            <TextField isInvalid={amountInvalid}>
              <Input
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="Ingen mängd"
              />
              <FieldError>Ange ett tal större än noll</FieldError>
            </TextField>
            {units.length > 1 && (
              <View className="flex-row flex-wrap gap-2">
                {units.map((u) => {
                  const isSelected = u === unit;
                  return (
                    <Chip
                      key={u}
                      variant={isSelected ? "soft" : "secondary"}
                      color={isSelected ? "accent" : "default"}
                      onPress={() => setPickedUnit(u)}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Chip.Label>{UNIT_LABELS[u]}</Chip.Label>
                    </Chip>
                  );
                })}
              </View>
            )}
            <Typography.Paragraph type="body-xs" color="muted">
              Utan mängd hamnar varan på listan som en påminnelse.
            </Typography.Paragraph>
          </View>
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

// Ingredienserna är redan laddade i sin helhet (useIngredients), så sökningen
// filtrerar lokalt — som IngredientsPicker i receptformuläret.
const IngredientSearch = ({
  takenIds,
  onPick,
  onCreate,
}: {
  takenIds: Set<string>;
  onPick: (ingredient: PickerIngredient) => void;
  onCreate: (name: string) => void;
}) => {
  const ingredients = useIngredients();
  const [term, setTerm] = useState("");

  const q = term.trim().toLocaleLowerCase("sv");
  const all = ingredients.data ?? [];
  const matches = all.filter((i) =>
    i.name.toLocaleLowerCase("sv").includes(q),
  );
  const shown = matches.slice(0, MAX_SHOWN);
  const hasExactMatch = all.some(
    (i) => i.name.toLocaleLowerCase("sv") === q,
  );

  return (
    <View className="gap-2">
      <SearchBar
        value={term}
        onChange={setTerm}
        placeholder="Sök ingrediens, t.ex. mjölk"
      />

      {q.length > 0 && !hasExactMatch && (
        <Button
          variant="tertiary"
          className="rounded-2xl border border-dashed border-accent bg-accent-soft"
          onPress={() => onCreate(term.trim())}
        >
          <StyledIonicons name="add" size={20} className="text-accent" />
          <Typography.Paragraph className="text-accent">
            Skapa ”{term.trim()}”
          </Typography.Paragraph>
        </Button>
      )}

      {ingredients.isPending ? (
        <View className="items-center py-6">
          <Spinner />
        </View>
      ) : ingredients.isError ? (
        <View className="items-center gap-2 py-4">
          <Typography.Paragraph color="muted">
            Kunde inte hämta ingredienserna.
          </Typography.Paragraph>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => ingredients.refetch()}
          >
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : shown.length > 0 ? (
        <ListGroup>
          {shown.map((ingredient, i) => {
            const isTaken = takenIds.has(ingredient.id);
            return (
              <Fragment key={ingredient.id}>
                {i > 0 && <Separator className="mx-4" />}
                <ListGroup.Item
                  disabled={isTaken}
                  className={isTaken ? "opacity-50" : ""}
                  onPress={() => onPick(ingredient)}
                >
                  <ListGroup.ItemPrefix>
                    <Category category={ingredient.category} />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{ingredient.name}</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {isTaken
                        ? "Redan en återkommande vara"
                        : CATEGORY_LABELS[ingredient.category]}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                </ListGroup.Item>
              </Fragment>
            );
          })}
        </ListGroup>
      ) : null}

      {matches.length > MAX_SHOWN && (
        <Typography.Paragraph type="body-xs" color="muted" align="center">
          Visar {MAX_SHOWN} av {matches.length}. Sök för att hitta fler.
        </Typography.Paragraph>
      )}
    </View>
  );
};

export default RecurringItemScreen;
