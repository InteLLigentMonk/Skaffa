import DensitySheet from "@/components/density-sheet";
import { isValidAmount, UNIT_LABELS, UnitCode, unitsFor } from "@/lib/units";
import {
  FieldError,
  Input,
  InputGroup,
  Label,
  PressableFeedback,
  Select,
  TextField,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { RecipeFormValues, RecipeIngredientRow } from "../recipe-types";

type UnitFieldProps = {
  index: number;
  ingredient: Pick<
    RecipeIngredientRow,
    "ingredientId" | "name" | "homeId" | "dimension"
  >;
};

export const NameField = () => {
  const { control } = useFormContext<RecipeFormValues>();

  return (
    <Controller
      control={control}
      name="name"
      rules={{ required: "Receptet måste ha ett namn" }}
      render={({ fieldState: { error }, field }) => (
        <TextField isRequired isInvalid={!!error}>
          <Label>Namn</Label>
          <Input
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="sentences"
            placeholder="Pasta Bolognése"
          />
          <FieldError>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
};

// Valfri. Tom betyder "ingen tid", och då matchar receptet aldrig
// "Snabbt"-filtret (recipe_facets.is_quick).
export const PrepMinutesField = () => {
  const { control } = useFormContext<RecipeFormValues>();

  return (
    <Controller
      control={control}
      name="prepMinutes"
      rules={{
        validate: (value) =>
          value === "" ||
          /^[1-9]\d{0,2}$/.test(value) ||
          "Ange tiden i hela minuter",
      }}
      render={({ fieldState: { error }, field }) => (
        <TextField isInvalid={!!error}>
          <Label>Tid</Label>
          <InputGroup>
            <InputGroup.Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="30"
            />
            <InputGroup.Suffix isDecorative>
              <Typography.Paragraph color="muted">min</Typography.Paragraph>
            </InputGroup.Suffix>
          </InputGroup>
          <FieldError>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
};

export const AmountField = ({ index }: { index: number }) => {
  const { control } = useFormContext<RecipeFormValues>();

  return (
    <Controller
      name={`ingredients.${index}.amount`}
      control={control}
      rules={{
        required: "Ange mängd",
        validate: (value) =>
          isValidAmount(value) || "Mängden måste vara ett giltigt positivt tal",
      }}
      render={({ field, fieldState: { error } }) => (
        <TextField isRequired isInvalid={!!error}>
          <Input
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            className="w-16"
          />
          <FieldError>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
};

export const UnitField = ({ index, ingredient }: UnitFieldProps) => {
  const { control, setValue } = useFormContext<RecipeFormValues>();
  const density = useWatch({ control, name: `ingredients.${index}.density` });
  const units = unitsFor(ingredient.dimension, density);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isDensitySheetOpen, setIsDensitySheetOpen] = useState(false);

  // Antal har inget att välja mellan. En popover med ett alternativ är sämre
  // än ingen — värdet är redan satt av DEFAULT_UNIT när raden lades till.
  if (units.length === 1) {
    return <Typography.Paragraph>{UNIT_LABELS[units[0]]}</Typography.Paragraph>;
  }

  return (
    <>
      <Controller
        name={`ingredients.${index}.unit`}
        control={control}
        render={({ field }) => (
          <Select
            isOpen={isSelectOpen}
            onOpenChange={setIsSelectOpen}
            className="flex-1"
            value={{ value: field.value, label: UNIT_LABELS[field.value] }}
            onValueChange={(opt) => {
              if (!opt) return;
              field.onChange(opt.value as UnitCode);
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="Välj enhet" />
              <Select.TriggerIndicator />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay />
              <Select.Content presentation="popover" width="trigger">
                {units.map((u) => (
                  <Select.Item key={u} value={u} label={UNIT_LABELS[u]} />
                ))}
                {/* Frörader (homeId null) delas mellan alla hem och avvisas av
                    RLS, så frågan ställs bara för hemmets egna ingredienser. */}
                {density == null && ingredient.homeId != null && (
                  <PressableFeedback
                    onPress={() => {
                      setIsSelectOpen(false);
                      setIsDensitySheetOpen(true);
                    }}
                    className="bg-accent-soft rounded-2xl p-2"
                  >
                    <Typography.Paragraph className="text-accent text-center py-2">
                      Saknas enhet?
                    </Typography.Paragraph>
                  </PressableFeedback>
                )}
              </Select.Content>
            </Select.Portal>
          </Select>
        )}
      />
      <DensitySheet
        isOpen={isDensitySheetOpen}
        ingredientId={ingredient.ingredientId}
        ingredientName={ingredient.name}
        onClose={() => setIsDensitySheetOpen(false)}
        onSaved={(d) => setValue(`ingredients.${index}.density`, d)}
      />
    </>
  );
};
