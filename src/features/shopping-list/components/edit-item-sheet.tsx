import { useHome } from "@/features/home/hooks/use-home";
import AmountField from "@/features/ingredients/components/amount-field";
import { useIngredients } from "@/features/ingredients/hooks/use-ingredients";
import { useSheetOpen } from "@/hooks/use-sheet-open";
import { IsoDate } from "@/lib/dates";
import {
  DEFAULT_UNIT,
  formatAmount,
  formatNumber,
  isValidAmount,
  parseAmount,
  toBase,
  UnitCode,
  UnitDimension,
  unitsFor,
} from "@/lib/units";
import {
  BottomSheet,
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useUpdateManualItem } from "../hooks/use-shopping-list";
import { ShoppingListItem } from "../shopping-list-types";

type Props = {
  item: ShoppingListItem;
  weekStart: IsoDate;
  isOpen: boolean;
  onClose: () => void;
};

// Ändrar en vara man lagt till själv. Fritext har bara ett namn; en vara som
// är en ingrediens har ett fast namn (det är ingrediensens) men en mängd.
// Monteras om för varje öppning (key i skärmen), så fälten börjar från varan.
const EditItemSheet = ({ item, weekStart, isOpen, onClose }: Props) => {
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
          {/* Eget komponent: useBottomSheetAwareHandlers måste anropas
              inuti BottomSheet.Content — se density-sheet.tsx. */}
          {item.ingredientId && item.dimension ? (
            <AmountForm
              item={item}
              dimension={item.dimension}
              weekStart={weekStart}
              onDone={onClose}
            />
          ) : (
            <NameForm item={item} weekStart={weekStart} onDone={onClose} />
          )}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

const NameForm = ({
  item,
  weekStart,
  onDone,
}: {
  item: ShoppingListItem;
  weekStart: IsoDate;
  onDone: () => void;
}) => {
  const { data: home } = useHome();
  const update = useUpdateManualItem();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const [name, setName] = useState(item.name);

  const canSave = !!home && !update.isPending && name.trim().length > 0;

  const submit = () => {
    if (!home) return;
    update.mutate(
      {
        homeId: home.id,
        weekStart,
        patch: { id: item.id, name: name.trim() },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <View className="gap-4">
      <BottomSheet.Title>Ändra vara</BottomSheet.Title>
      <TextField>
        <Label>Vara</Label>
        <Input
          value={name}
          maxLength={120}
          onChangeText={setName}
          autoFocus
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="done"
          onSubmitEditing={() => canSave && submit()}
        />
      </TextField>
      <FieldError isInvalid={!!update.error}>
        Kunde inte spara varan. Försök igen.
      </FieldError>
      <Button size="lg" isDisabled={!canSave} onPress={submit}>
        <Button.Label>{update.isPending ? "Sparar…" : "Spara"}</Button.Label>
      </Button>
    </View>
  );
};

const AmountForm = ({
  item,
  dimension,
  weekStart,
  onDone,
}: {
  item: ShoppingListItem;
  dimension: UnitDimension;
  weekStart: IsoDate;
  onDone: () => void;
}) => {
  const { data: home } = useHome();
  const update = useUpdateManualItem();
  // Listraden bär inte densiteten. Ingredienslistan är nästan alltid cachad;
  // saknas den blir det bara ingrediensens eget måttslag att välja på.
  const density =
    useIngredients().data?.find((i) => i.id === item.ingredientId)
      ?.density_g_per_ml ?? null;

  // Största runda enheten, så 2000 g visas som "2 kg" — samma som i listan.
  const initial = item.amountBase
    ? formatAmount(item.amountBase, dimension)
    : null;
  const [amountText, setAmountText] = useState(
    initial ? formatNumber(initial.value) : "",
  );
  const [pickedUnit, setPickedUnit] = useState<UnitCode | null>(
    initial?.unit ?? null,
  );

  const units = unitsFor(dimension, density);
  const unit =
    pickedUnit && units.includes(pickedUnit) ? pickedUnit : DEFAULT_UNIT[dimension];

  const hasAmount = amountText.trim().length > 0;
  const amountInvalid = hasAmount && !isValidAmount(amountText);
  const canSave = !!home && !update.isPending && !amountInvalid;

  const submit = () => {
    if (!home) return;
    const amount = hasAmount
      ? toBase(parseAmount(amountText), unit, dimension, density)
      : null;

    update.mutate(
      { homeId: home.id, weekStart, patch: { id: item.id, amount } },
      { onSuccess: onDone },
    );
  };

  return (
    <View className="gap-4">
      <View>
        <BottomSheet.Title>{item.name}</BottomSheet.Title>
        <BottomSheet.Description>Ändra mängden</BottomSheet.Description>
      </View>
      <AmountField
        value={amountText}
        onChange={setAmountText}
        units={units}
        unit={unit}
        onUnitChange={setPickedUnit}
        isInvalid={amountInvalid}
      />
      <FieldError isInvalid={!!update.error}>
        Kunde inte spara varan. Försök igen.
      </FieldError>
      <Button size="lg" isDisabled={!canSave} onPress={submit}>
        <Button.Label>{update.isPending ? "Sparar…" : "Spara"}</Button.Label>
      </Button>
    </View>
  );
};

export default EditItemSheet;
