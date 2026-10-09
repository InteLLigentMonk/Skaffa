import DashedButton from "@/components/dashed-button";
import { StyledIonicons } from "@/utils/helpers";
import { Label, Typography } from "heroui-native";
import { useEffect, useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { TextInput, View } from "react-native";
import { NestedReorderableList } from "react-native-reorderable-list";
import { RecipeFormValues } from "../recipe-types";
import RecipeStepRow from "./recipe-step-row";

type FocusTarget = { index: number; caret: "start" | "end" };

// Måste ligga inuti en ScrollViewContainer från react-native-reorderable-list,
// som ersätter formulärets ScrollView.
const RecipeStepsField = () => {
  const { control, getValues, setValue } = useFormContext<RecipeFormValues>();
  const { fields, append, insert, remove, move } = useFieldArray({
    control,
    name: "steps",
  });

  const inputs = useRef(new Map<string, TextInput>());
  // Ett nytt steg finns inte som TextInput förrän useFieldArray renderat om,
  // så fokus kan inte sättas i samma handler som lägger till steget. Målet
  // parkeras här och plockas upp av effekten när fields ändrats.
  const pendingFocus = useRef<FocusTarget | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const field = fields[target.index];
    const input = field && inputs.current.get(field.id);
    if (!input) return;

    pendingFocus.current = null;
    const caret =
      target.caret === "start"
        ? 0
        : getValues(`steps.${target.index}.content`).length;
    input.focus();
    // Efter focus(): annars lägger plattformen markören där den vill.
    requestAnimationFrame(() => input.setSelection(caret, caret));
  }, [fields, getValues]);

  const addStep = () => {
    pendingFocus.current = { index: fields.length, caret: "end" };
    append({ content: "" }, { shouldFocus: false });
  };

  const split = (index: number, parts: string[], isReturn: boolean) => {
    const [first, ...rest] = parts;
    setValue(`steps.${index}.content`, first, { shouldDirty: true });

    // Retur: svansen efter markören blir nästa steg, även om den är tom.
    // Inklistring: varje icke-tom rad blir ett eget steg.
    const added = isReturn
      ? rest
      : rest.map((line) => line.trim()).filter((line) => line.length > 0);
    if (added.length === 0) return;

    pendingFocus.current = isReturn
      ? { index: index + 1, caret: "start" }
      : { index: index + added.length, caret: "end" };
    insert(
      index + 1,
      added.map((content) => ({ content })),
      { shouldFocus: false },
    );
  };

  const removeEmpty = (index: number) => {
    pendingFocus.current = { index: index - 1, caret: "end" };
    remove(index);
  };

  return (
    <View>
      <Label>Steg</Label>
      <NestedReorderableList
        data={fields}
        // Nyckeln är field.id, aldrig index: index byter rad vid varje drag.
        keyExtractor={(field) => field.id}
        onReorder={({ from, to }) => move(from, to)}
        // Listan skrollar aldrig själv, det gör formuläret (och biblioteket
        // autoskrollar det vid drag). Utan den här raden är FlatListens
        // scrollEnabled true, och RN varnar för en skrollbar VirtualizedList
        // inuti en vanlig ScrollView.
        scrollEnabled={false}
        // Virtualiseringen får inte avmontera ett steg som har fokus.
        initialNumToRender={Math.max(fields.length, 10)}
        windowSize={51}
        renderItem={({ item, index }) => (
          <RecipeStepRow
            index={index}
            registerInput={(input) => {
              if (input) inputs.current.set(item.id, input);
              else inputs.current.delete(item.id);
            }}
            onSplit={split}
            onRemoveEmpty={removeEmpty}
          />
        )}
      />
      <DashedButton
        onPress={addStep}
        color="green"
        className="mt-2 flex flex-row items-center justify-center gap-2"
      >
        <StyledIonicons name="add-outline" size={20} className="text-accent" />
        <Typography.Heading type="h5" weight="bold" className="text-accent">
          Lägg till steg
        </Typography.Heading>
      </DashedButton>
    </View>
  );
};

export default RecipeStepsField;
