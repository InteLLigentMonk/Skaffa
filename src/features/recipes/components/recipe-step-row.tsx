import { StyledIonicons } from "@/utils/helpers";
import { Input, Typography } from "heroui-native";
import { Controller, useFormContext } from "react-hook-form";
import { Keyboard, Pressable, TextInput, View } from "react-native";
import { useReorderableDrag } from "react-native-reorderable-list";
import { RecipeFormValues } from "../recipe-types";

type Props = {
  index: number;
  registerInput: (input: TextInput | null) => void;
  // parts är texten delad på radbrytningar. isReturn skiljer ett tryck på
  // Retur (exakt ett nytt "\n") från inklistrad text.
  onSplit: (index: number, parts: string[], isReturn: boolean) => void;
  onRemoveEmpty: (index: number) => void;
};

const LINE_BREAK = /\r\n|\r|\n/;

const RecipeStepRow = ({
  index,
  registerInput,
  onSplit,
  onRemoveEmpty,
}: Props) => {
  const { control } = useFormContext<RecipeFormValues>();
  const drag = useReorderableDrag();

  return (
    <View className="flex-row items-start gap-2 py-1">
      <View className="mt-3 size-7 items-center justify-center rounded-full bg-accent-soft">
        <Typography.Paragraph type="body-sm" className="font-bold text-accent">
          {index + 1}
        </Typography.Paragraph>
      </View>
      <Controller
        control={control}
        name={`steps.${index}.content`}
        render={({ field }) => (
          <View className="flex-1">
            <Input
              ref={registerInput}
              value={field.value}
              onBlur={field.onBlur}
              // Retur och inklistring går samma väg: varje radbrytning som
              // når hit är en delningspunkt, så värdet i formuläret
              // innehåller aldrig "\n". Retur sätter "\n" där markören står,
              // och därför delas steget vid markören utan att vi behöver
              // spåra markörpositionen.
              onChangeText={(text) => {
                if (!LINE_BREAK.test(text)) {
                  field.onChange(text);
                  return;
                }
                const parts = text.split(LINE_BREAK);
                const isReturn =
                  parts.length === 2 &&
                  text.length === field.value.length + 1;
                onSplit(index, parts, isReturn);
              }}
              // onKeyPress kommer före onChangeText, så field.value är värdet
              // innan backsteget — tomt betyder att fältet redan var tomt.
              onKeyPress={(e) => {
                if (
                  e.nativeEvent.key === "Backspace" &&
                  field.value === "" &&
                  index > 0
                ) {
                  onRemoveEmpty(index);
                }
              }}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              autoCapitalize="sentences"
              placeholder={index === 0 ? "Beskriv första steget" : "Nästa steg"}
              className="py-3"
            />
          </View>
        )}
      />
      {/* Draget startar bara härifrån. Ett finger på texten skrollar
          formuläret som vanligt. Tangentbordet stängs först, annars ändras
          layouten mitt i draget. */}
      <Pressable
        onPressIn={() => {
          Keyboard.dismiss();
          drag();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Flytta steg ${index + 1}`}
        className="mt-3 p-1"
      >
        <StyledIonicons
          name="reorder-three-outline"
          size={22}
          className="text-muted"
        />
      </Pressable>
    </View>
  );
};

export default RecipeStepRow;
