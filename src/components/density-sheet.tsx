import { useSetIngredientDensity } from "@/features/ingredients/hooks/use-ingredients";
import { isValidAmount, parseAmount } from "@/lib/units";
import {
  BottomSheet,
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { Control, Controller, useForm } from "react-hook-form";
import { View } from "react-native";

type Props = {
  ingredientId: string;
  ingredientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (density: number) => void;
};

// Formuläret bär frågan användaren får, inte det som lagras: ingen vet vad
// mandelmjöls densitet är, men alla kan väga en deciliter. Omräkningen till
// g/ml sker vid submit.
type DensityFormValues = {
  grams: string;
};

// useBottomSheetAwareHandlers måste anropas från en komponent som renderas
// INUTI BottomSheet.Content. Anropas den en nivå upp — där BottomSheet-roten
// skapas — är den utanför kontexten och returnerar tysta no-ops, och
// tangentbordet lägger sig över fältet i stället för att arket flyttar på sig.
const GramsField = ({ control }: { control: Control<DensityFormValues> }) => {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <Controller
      name="grams"
      control={control}
      rules={{
        required: "Ange en vikt",
        validate: (value) =>
          (isValidAmount(value) && parseAmount(value) <= 300) ||
          "Ange en rimlig vikt i gram",
      }}
      render={({ field, fieldState: { error } }) => (
        <TextField isRequired isInvalid={!!error}>
          <Label>Gram</Label>
          <Input
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <FieldError isInvalid={!!error}>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
};

const DensitySheet = ({
  ingredientId,
  ingredientName,
  isOpen,
  onClose,
  onSaved,
}: Props) => {
  const { control, handleSubmit, reset } = useForm<DensityFormValues>({
    defaultValues: { grams: "" },
  });

  const { mutate, isPending } = useSetIngredientDensity();

  const onSubmit = handleSubmit(({ grams }) => {
    const density = parseAmount(grams) / 100;

    mutate(
      { id: ingredientId, density },
      {
        // onSaved fyras först när skrivningen gått igenom — annars låses
        // enheterna upp i receptformuläret för en densitet som aldrig sparades.
        onSuccess: () => {
          onSaved(density);
          reset();
          onClose();
        },
      },
    );
  });

  return (
    <BottomSheet
      isOpen={isOpen}
      // onOpenChange på roten fångar ALLA stängningar: svep, overlay-tryck,
      // stängknapp och programmatisk. BottomSheet.Content har en egen onClose
      // men den fyrar bara vid svep.
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-4">
            <BottomSheet.Title>
              Hur mycket väger 1 dl {ingredientName}?
            </BottomSheet.Title>
            <BottomSheet.Description>
              Väg upp en deciliter, så kan {ingredientName} anges i både vikt
              och volym i dina recept.
            </BottomSheet.Description>
            <GramsField control={control} />
            <Button onPress={onSubmit} isDisabled={isPending}>
              <Typography.Heading
                type="h6"
                weight="bold"
                className="text-white"
              >
                Spara
              </Typography.Heading>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

export default DensitySheet;
