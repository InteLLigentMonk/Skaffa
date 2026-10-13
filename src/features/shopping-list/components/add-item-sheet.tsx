import { useHome } from "@/features/home/hooks/use-home";
import AmountField from "@/features/ingredients/components/amount-field";
import Category from "@/features/ingredients/components/category";
import IngredientSearch from "@/features/ingredients/components/ingredient-search";
import {
  CATEGORY_LABELS,
  PickerIngredient,
} from "@/features/ingredients/ingredient-types";
import { IsoDate, isoWeek } from "@/lib/dates";
import { useSheetOpen } from "@/hooks/use-sheet-open";
import {
  DEFAULT_UNIT,
  isValidAmount,
  parseAmount,
  toBase,
  UnitCode,
  unitsFor,
} from "@/lib/units";
import {
  BottomSheet,
  Button,
  Checkbox,
  ControlField,
  Description,
  FieldError,
  Input,
  Label,
  Surface,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useAddListItem } from "../hooks/use-shopping-list";

type Props = {
  weekStart: IsoDate;
  isOpen: boolean;
  onClose: () => void;
};

// Monteras om för varje öppning (key i skärmen), så formuläret börjar alltid
// tomt.
const AddItemSheet = ({ weekStart, isOpen, onClose }: Props) => {
  // Se use-sheet-open: arket monteras ofta redan öppet.
  const sheetOpen = useSheetOpen(isOpen);

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
          <AddItemForm weekStart={weekStart} onDone={onClose} />
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

// Eget komponent: useBottomSheetAwareHandlers (i fälten) måste anropas inuti
// BottomSheet.Content — se kommentaren i density-sheet.tsx.
const AddItemForm = ({
  weekStart,
  onDone,
}: {
  weekStart: IsoDate;
  onDone: () => void;
}) => {
  const { data: home } = useHome();
  const add = useAddListItem();

  const [isFreeText, setIsFreeText] = useState(false);
  const [freeName, setFreeName] = useState("");
  const [ingredient, setIngredient] = useState<PickerIngredient | null>(null);
  const [amountText, setAmountText] = useState("");
  const [pickedUnit, setPickedUnit] = useState<UnitCode | null>(null);

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

  const canSave =
    !!home &&
    !add.isPending &&
    (isFreeText
      ? freeName.trim().length > 0
      : !!ingredient && !amountInvalid);

  const pick = (picked: PickerIngredient) => {
    setIngredient(picked);
    // Ny ingrediens kan ha ett annat måttslag; enheten väljs om.
    setPickedUnit(null);
  };

  // Finns varan inte bland ingredienserna blir den fritext: den ska bara
  // stå på den här listan, inte bli en ingrediens hemmet måste hålla rätt på.
  const toFreeText = (name: string) => {
    setFreeName(name);
    setIsFreeText(true);
  };

  const submit = () => {
    if (!home) return;

    if (isFreeText) {
      add.mutate(
        { kind: "free", homeId: home.id, weekStart, name: freeName.trim() },
        { onSuccess: onDone },
      );
      return;
    }

    if (!ingredient || !unit) return;
    const amountBase = hasAmount
      ? toBase(
          parseAmount(amountText),
          unit,
          ingredient.dimension,
          ingredient.density_g_per_ml,
        )
      : null;

    add.mutate(
      { kind: "ingredient", homeId: home.id, weekStart, ingredient, amountBase },
      { onSuccess: onDone },
    );
  };

  return (
    <View className="gap-4">
      <View>
        <BottomSheet.Title>Lägg till vara</BottomSheet.Title>
        <BottomSheet.Description>
          På listan för vecka {isoWeek(weekStart)}
        </BottomSheet.Description>
      </View>

      <ControlField
        isSelected={isFreeText}
        onSelectedChange={setIsFreeText}
        className="rounded-2xl bg-surface-secondary p-3"
      >
        <ControlField.Indicator>
          <Checkbox />
        </ControlField.Indicator>
        <View className="flex-1">
          <Label>Manuell (fritext)</Label>
          <Description>
            Finns inte bland ingredienserna och hamnar bara på den här listan
          </Description>
        </View>
      </ControlField>

      {isFreeText ? (
        <FreeTextField value={freeName} onChange={setFreeName} />
      ) : ingredient ? (
        <>
          <Surface
            variant="secondary"
            className="flex-row items-center gap-3 rounded-2xl p-3"
          >
            <Category category={ingredient.category} />
            <View className="flex-1">
              <Typography.Heading type="h6" weight="bold">
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
              onPress={() => setIngredient(null)}
            >
              <Button.Label>Byt</Button.Label>
            </Button>
          </Surface>
          <AmountField
            value={amountText}
            onChange={setAmountText}
            units={units}
            unit={unit}
            onUnitChange={setPickedUnit}
            isInvalid={amountInvalid}
          />
        </>
      ) : (
        <IngredientSearch
          onPick={pick}
          onCreate={toFreeText}
          createLabel={(name) => `Lägg till ”${name}” som fritext`}
        />
      )}

      <FieldError isInvalid={!!add.error}>
        Kunde inte lägga till varan. Försök igen.
      </FieldError>

      {(isFreeText || ingredient) && (
        <Button size="lg" isDisabled={!canSave} onPress={submit}>
          <Button.Label>
            {add.isPending ? "Lägger till…" : "Lägg till på listan"}
          </Button.Label>
        </Button>
      )}
    </View>
  );
};

const FreeTextField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) => {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <TextField>
      <Label>Vara</Label>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder="T.ex. grillkol"
        maxLength={120}
        autoFocus
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </TextField>
  );
};

export default AddItemSheet;
