import { useHome } from "@/features/home/hooks/use-home";
import { useCreateIngredient } from "@/features/ingredients/hooks/use-ingredients";
import {
  CATEGORY_LABELS,
  DIET_TAG_LABELS,
  NewIngredientValues,
  PickerIngredient,
} from "@/features/ingredients/ingredient-types";
import { DIMENSION_LABELS } from "@/lib/units";
import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  PressableFeedback,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScrollView, View } from "react-native";
import Category from "./category";

type Props = {
  initialName: string;
  onCreated: (ingredient: PickerIngredient) => void;
  /**
   * Hushåll (diskmedel, toapapper) hör inte hemma i recept, så receptflödet
   * erbjuder inte kategorin. Återkommande varor gör det.
   */
  allowHousehold?: boolean;
};

// Delas av receptformulärets new-ingredient-skärm och formuläret för
// återkommande varor. Ingen rubrik eller tillbaka-knapp: det avgör skärmen
// som visar formuläret. Fyller sin förälder (flex-1) med knappen längst ner.
const NewIngredientForm = ({
  initialName,
  onCreated,
  allowHousehold = false,
}: Props) => {
  const { data: home } = useHome();
  const { mutate, isPending } = useCreateIngredient();

  const categories = Object.keys(
    CATEGORY_LABELS,
  ) as (keyof typeof CATEGORY_LABELS)[];

  const dimensions = Object.keys(
    DIMENSION_LABELS,
  ) as (keyof typeof DIMENSION_LABELS)[];
  const dietTags = Object.keys(
    DIET_TAG_LABELS,
  ) as (keyof typeof DIET_TAG_LABELS)[];

  const { control, handleSubmit, setError } = useForm<NewIngredientValues>({
    defaultValues: {
      name: initialName,
      dimension: null,
      category: null,
      dietTag: null,
    },
  });
  // "Kött eller fisk?" betyder inget för diskmedel, så frågan försvinner.
  const isHousehold =
    useWatch({ control, name: "category" }) === "household";

  return (
    <View className="flex-1 flex-col gap-4">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
        contentContainerClassName="gap-8"
      >
        <Controller
          name="name"
          control={control}
          rules={{
            validate: (v) => v.trim().length > 0 || "Du måste ange ett namn",
          }}
          render={({ field, fieldState: { error } }) => (
            <TextField isRequired isInvalid={!!error}>
              <Label>Namn</Label>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                returnKeyType="next"
              />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          name="category"
          control={control}
          rules={{
            required: "Du måste ange en kategori",
          }}
          render={({ field, fieldState: { error } }) => (
            <View className="flex-col gap-1">
              <Label isRequired>Kategori</Label>
              <View
                className="flex-row flex-wrap -mx-1"
                accessibilityRole="radiogroup"
              >
                {categories.map((category) => {
                  if (category === "household" && !allowHousehold) return null;

                  const isSelected = field.value === category;
                  return (
                    <PressableFeedback
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      key={category}
                      className="w-1/3 p-1"
                      onPress={() => field.onChange(category)}
                    >
                      <View
                        className={`rounded-2xl border p-2 items-center justify-center gap-2 ${
                          isSelected
                            ? "border-accent bg-accent/10"
                            : "border-muted/20"
                        }`}
                      >
                        <Category category={category} />
                        <Typography.Paragraph
                          type="body-sm"
                          color="muted"
                          className="text-center"
                        >
                          {CATEGORY_LABELS[category]}
                        </Typography.Paragraph>
                      </View>
                    </PressableFeedback>
                  );
                })}
              </View>
              <FieldError isInvalid={!!error}>{error?.message}</FieldError>
            </View>
          )}
        />
        <Controller
          name="dimension"
          control={control}
          rules={{
            required: "Du måste ange en dimension",
          }}
          render={({ field, fieldState: { error } }) => (
            <View className="flex-col gap-2">
              <Label isRequired>Mäts i</Label>
              <View
                className="flex-row flex-wrap gap-2"
                accessibilityRole="radiogroup"
              >
                {dimensions.map((dimension) => {
                  const isSelected = field.value === dimension;
                  return (
                    <Chip
                      onPress={() => field.onChange(dimension)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      key={dimension}
                      size="lg"
                      color={isSelected ? "accent" : "default"}
                    >
                      <Chip.Label>{DIMENSION_LABELS[dimension]}</Chip.Label>
                    </Chip>
                  );
                })}
              </View>
              <FieldError isInvalid={!!error}>{error?.message}</FieldError>
              <Surface
                variant="secondary"
                className="flex-row items-start gap-2 bg-warning-soft"
              >
                <StyledIonicons
                  name="information-circle-outline"
                  size={20}
                  className="text-warning-soft-foreground"
                />
                <Typography.Paragraph
                  type="body-sm"
                  className="flex-1 text-warning-soft-foreground"
                >
                  Måttslaget är fast och kan inte ändras senare. Enheten
                  väljer du fritt i varje recept — en volymvara kan anges i
                  både dl och msk.
                </Typography.Paragraph>
              </Surface>
            </View>
          )}
        />

        {!isHousehold && (
          <Controller
            name="dietTag"
            control={control}
            // validate i stället för required: fältet avregistreras inte när det
            // döljs, så regeln måste själv släppa igenom hushållsvaror.
            rules={{
              validate: (value, values) =>
                values.category === "household" ||
                value !== null ||
                "Du måste ange ett kostslag",
            }}
            render={({ field, fieldState: { error } }) => (
              <View className="flex-col gap-2">
                <Label isRequired>Kött eller fisk?</Label>
                <View
                  className="flex-row flex-wrap gap-2"
                  accessibilityRole="radiogroup"
                >
                  {dietTags.map((tag) => {
                    const isSelected = field.value === tag;
                    return (
                      <Chip
                        onPress={() => field.onChange(tag)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        key={tag}
                        size="lg"
                        color={isSelected ? "accent" : "default"}
                      >
                        <Chip.Label>{DIET_TAG_LABELS[tag]}</Chip.Label>
                      </Chip>
                    );
                  })}
                </View>
                <FieldError isInvalid={!!error}>{error?.message}</FieldError>
                <Surface
                  variant="secondary"
                  className="flex-row items-start gap-2 mb-4 bg-warning-soft"
                >
                  <StyledIonicons
                    name="information-circle-outline"
                    size={20}
                    className="text-warning-soft-foreground"
                  />
                  <Typography.Paragraph
                    type="body-sm"
                    className="flex-1 text-warning-soft-foreground"
                  >
                    Diettaggen används för att filtrera ingredienser i recept
                    och inköpslistor. Välj ”Varken” om ingrediensen inte
                    innehåller kött eller fisk.
                  </Typography.Paragraph>
                </Surface>
              </View>
            )}
          />
        )}
      </ScrollView>
      <Button
        variant="primary"
        isDisabled={!home || isPending}
        onPress={handleSubmit((values) => {
          if (!home) return;
          mutate(
            {
              homeId: home.id,
              name: values.name,
              category: values.category!,
              dimension: values.dimension!,
              // Väljer man kött och byter till Hushåll ligger "kott" kvar i
              // formuläret fast frågan är dold — skicka aldrig vidare den.
              dietTag:
                values.category === "household" || values.dietTag === "neutral"
                  ? null
                  : values.dietTag,
            },
            {
              onSuccess: onCreated,
              onError: (error) => {
                if (error.code === "23505") {
                  setError("name", {
                    message: "Ingrediens med det namnet finns redan",
                  });
                  return;
                }
                // Triggern guard_ingredient_name_vs_seed: namnet finns redan
                // bland frö-ingredienserna. Meddelandet är skrivet för att
                // visas rakt upp.
                if (error.code === "P0001") {
                  setError("name", { message: error.message });
                  return;
                }
                setError("name", {
                  message: "Kunde inte spara ingrediens, försök igen senare",
                });
              },
            },
          );
        })}
      >
        Spara ingrediens
      </Button>
    </View>
  );
};

export default NewIngredientForm;
