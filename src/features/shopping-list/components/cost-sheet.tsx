import { useHome } from "@/features/home/hooks/use-home";
import { useSheetOpen } from "@/hooks/use-sheet-open";
import { IsoDate, isoWeek } from "@/lib/dates";
import { formatNumber, isValidAmount, parseAmount } from "@/lib/units";
import {
  BottomSheet,
  Button,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useCostHistory, useSetTotalCost } from "../hooks/use-shopping-list";
import { formatKr } from "../shopping-list-types";
import CostChart from "./cost-chart";

// Tillräckligt för att se en trend utan att staplarna blir streck.
const CHART_WEEKS = 8;

type Props = {
  weekStart: IsoDate;
  totalCost: number | null;
  isOpen: boolean;
  onClose: () => void;
};

const CostSheet = ({ weekStart, totalCost, isOpen, onClose }: Props) => {
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
          <CostForm
            weekStart={weekStart}
            totalCost={totalCost}
            onDone={onClose}
          />
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

// Eget komponent av samma skäl som AddItemForm: fältets
// useBottomSheetAwareHandlers måste ligga inuti BottomSheet.Content.
const CostForm = ({
  weekStart,
  totalCost,
  onDone,
}: {
  weekStart: IsoDate;
  totalCost: number | null;
  onDone: () => void;
}) => {
  const { data: home } = useHome();
  const history = useCostHistory();
  const save = useSetTotalCost();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const [text, setText] = useState(
    totalCost === null ? "" : formatNumber(totalCost),
  );
  const isEmpty = text.trim().length === 0;
  const isInvalid = !isEmpty && !isValidAmount(text);

  const submit = (value: number | null) => {
    if (!home) return;
    save.mutate(
      { homeId: home.id, weekStart, totalCost: value },
      { onSuccess: onDone },
    );
  };

  const points = history.data ?? [];
  const average =
    points.length > 0
      ? points.reduce((sum, p) => sum + p.totalCost, 0) / points.length
      : null;

  return (
    <View className="gap-4">
      <View>
        <BottomSheet.Title>Veckans inhandling</BottomSheet.Title>
        <BottomSheet.Description>
          Vad kostade maten vecka {isoWeek(weekStart)}? Valfritt — det ger dig
          ett snitt över tid.
        </BottomSheet.Description>
      </View>

      <TextField isInvalid={isInvalid}>
        <Label>Belopp (kr)</Label>
        <Input
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="T.ex. 1250"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <FieldError>Ange ett belopp större än noll</FieldError>
      </TextField>

      <FieldError isInvalid={!!save.error}>
        Kunde inte spara beloppet. Försök igen.
      </FieldError>

      <View className="flex-row gap-2">
        {totalCost !== null && (
          <Button
            variant="tertiary"
            className="flex-1 rounded-2xl bg-field"
            isDisabled={save.isPending}
            onPress={() => submit(null)}
          >
            <Button.Label>Ta bort</Button.Label>
          </Button>
        )}
        <Button
          className="flex-1"
          isDisabled={isEmpty || isInvalid || save.isPending || !home}
          onPress={() => submit(parseAmount(text))}
        >
          <Button.Label>{save.isPending ? "Sparar…" : "Spara"}</Button.Label>
        </Button>
      </View>

      {history.isPending ? (
        <View className="items-center py-4">
          <Spinner />
        </View>
      ) : average !== null ? (
        <View className="gap-3 rounded-2xl bg-surface-secondary p-4">
          <View>
            <Typography.Paragraph type="body-xs" color="muted">
              Snitt per vecka
            </Typography.Paragraph>
            <Typography.Heading type="h3" weight="bold">
              {formatKr(average)}
            </Typography.Heading>
            <Typography.Paragraph type="body-xs" color="muted">
              {points.length === 1
                ? "Från 1 ifylld vecka"
                : `Från ${points.length} ifyllda veckor`}
            </Typography.Paragraph>
          </View>
          {points.length > 1 && (
            <CostChart points={points.slice(-CHART_WEEKS)} average={average} />
          )}
        </View>
      ) : (
        <Typography.Paragraph type="body-xs" color="muted" align="center">
          Fyll i några veckor så visas snittet och en graf här.
        </Typography.Paragraph>
      )}
    </View>
  );
};

export default CostSheet;
