import DashedButton from "@/components/dashed-button";
import NumberSelect from "@/components/number-select";
import RoundButton from "@/components/round-button";
import { useHome } from "@/features/home/hooks/use-home";
import RecipeImageField from "@/features/recipes/components/recipe-image-field";
import {
  AmountField,
  NameField,
  PrepMinutesField,
  UnitField,
} from "@/features/recipes/components/recipe-form-fields";
import RecipeStepsField from "@/features/recipes/components/recipe-steps-field";
import { useRecipeFormMode } from "@/features/recipes/contexts/recipe-form-context";
import { useRecipeImage } from "@/features/recipes/hooks/use-recipe-image";
import { useSaveRecipe } from "@/features/recipes/hooks/use-recipes";
import {
  deriveDiet,
  DIET_EMOJI,
  RecipeFormValues,
} from "@/features/recipes/recipe-types";
import useKeyboardVisible from "@/hooks/use-keyboard-visible";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import {
  Button,
  FieldError,
  InputGroup,
  Surface,
  Typography,
} from "heroui-native";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { KeyboardAvoidingView, View } from "react-native";
import { ScrollViewContainer } from "react-native-reorderable-list";
import { withUniwind } from "uniwind";

// Stegens draglista är nästlad i formulärets scroll. Biblioteket behöver sin
// egen ScrollView för att kunna skrolla formuläret när ett steg dras mot
// kanten.
const StyledScrollViewContainer = withUniwind(ScrollViewContainer);

const RecipeFormScreen = () => {
  const router = useRouter();
  const isKeyboardVisible = useKeyboardVisible();
  const { data: home } = useHome();
  const { isEditing, initialImageUrl } = useRecipeFormMode();
  const { mutate, isPending } = useSaveRecipe();
  const {
    control,
    getValues,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useFormContext<RecipeFormValues>();
  const { fields, remove } = useFieldArray({
    control,
    name: "ingredients",
    rules: { required: "Lägg till minst en ingrediens" },
  });

  // initialPath läses bara vid mount, precis som formulärets defaultValues.
  const image = useRecipeImage({
    homeId: home?.id,
    recipeId: getValues("id"),
    initialPath: getValues("imagePath"),
    initialUrl: initialImageUrl,
    onPathChange: (path) =>
      setValue("imagePath", path, { shouldDirty: true }),
  });

  // Platshållaren visar den kostklass receptet kommer att få, härledd på
  // samma sätt som recipe_facets.diet.
  const diet = deriveDiet(fields);

  const onSave = handleSubmit((values) => {
    // En misslyckad bild sparas inte tyst bort: användaren ser den i rutan
    // och ska välja själv mellan att försöka igen och att ta bort den.
    if (image.status === "error") {
      setError("root", {
        message: "Bilden laddades inte upp. Försök igen eller ta bort den.",
      });
      return;
    }

    mutate(
      {
        id: values.id,
        name: values.name,
        servings: values.servings,
        prepMinutes:
          values.prepMinutes === "" ? null : Number(values.prepMinutes),
        imagePath: values.imagePath,
        ingredients: values.ingredients,
        steps: values.steps
          .map((step) => step.content.trim())
          .filter((content) => content.length > 0),
      },
      {
        onSuccess: () => {
          image.commit(values.imagePath);
          router.back();
        },
        onError: (error) => {
          setError("root", {
            message:
              error.code === "P0001"
                ? error.message
                : "Kunde inte spara receptet, försök igen senare",
          });
        },
      },
    );
  });

  const saveLabel = image.isUploading
    ? "Laddar upp bild…"
    : isPending
      ? "Sparar…"
      : isEditing
        ? "Spara ändringar"
        : "Spara recept";

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <StyledScrollViewContainer
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
        contentContainerClassName="pb-6"
      >
        {/* ---- Bild ---- */}
        <RecipeImageField
          image={image}
          placeholderEmoji={diet ? DIET_EMOJI[diet] : "🍽️"}
        />

        {/* ---- Formuläret: samma ark som på detaljsidan ---- */}
        <View className="-mt-6 gap-6 rounded-t-3xl bg-background px-4 pt-6">
          <View className="gap-4">
            <Typography.Heading type="h2" weight="bold">
              {isEditing ? "Redigera recept" : "Nytt recept"}
            </Typography.Heading>
            <NameField />
          </View>

          <Surface variant="secondary" className="gap-4 rounded-2xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Typography.Paragraph weight="bold">
                  Portioner
                </Typography.Paragraph>
                <Typography.Paragraph type="body-xs" color="muted">
                  Mängderna nedan räcker till så här många
                </Typography.Paragraph>
              </View>
              <Controller
                control={control}
                name="servings"
                render={({ field }) => (
                  <NumberSelect {...field} min={1} max={20} />
                )}
              />
            </View>
            <PrepMinutesField />
          </Surface>

          <View className="gap-3">
            <Typography.Heading type="h5" weight="bold">
              Ingredienser
            </Typography.Heading>
            <View className="gap-2">
              {fields.map((row, index) => (
                <Surface key={row.id}>
                  <View className="flex flex-row items-center gap-2">
                    <View>
                      <StyledIonicons
                        name="fast-food-outline"
                        size={20}
                        className="text-muted"
                      />
                    </View>
                    <View className="flex-1 gap-2">
                      <Typography.Heading type="h5">
                        {row.name}
                      </Typography.Heading>
                      <View className="flex flex-row items-center gap-2">
                        <InputGroup className="flex-1 flex-row items-center gap-2">
                          <AmountField index={index} />
                          <UnitField index={index} ingredient={row} />
                        </InputGroup>
                      </View>
                    </View>
                    <Button
                      onPress={() => remove(index)}
                      accessibilityLabel={`Ta bort ${row.name}`}
                      className="bg-danger-soft p-2 rounded-xl"
                    >
                      <StyledIonicons
                        name="trash-bin-outline"
                        size={20}
                        className="text-danger"
                      />
                    </Button>
                  </View>
                </Surface>
              ))}
              <DashedButton
                onPress={() => router.push("/recipe-form/choose-ingredients")}
                color="green"
                className="flex flex-row items-center justify-center gap-2"
              >
                <StyledIonicons
                  name="add-outline"
                  size={20}
                  className="text-accent"
                />
                <Typography.Heading
                  type="h5"
                  weight="bold"
                  className="text-accent"
                >
                  Lägg till ingrediens
                </Typography.Heading>
              </DashedButton>
            </View>
            <FieldError isInvalid={!!errors.ingredients?.root}>
              {errors.ingredients?.root?.message}
            </FieldError>
          </View>

          <RecipeStepsField />

          <Surface variant="secondary" className="flex-row items-start gap-2">
            <StyledIonicons
              name="information-circle-outline"
              size={20}
              className="text-muted"
            />
            <Typography.Paragraph
              type="body-sm"
              color="muted"
              className="flex-1"
            >
              Namn, minst en ingrediens och portioner räcker för att spara. Bild
              + steg krävs bara om du vill publicera receptet.
            </Typography.Paragraph>
          </Surface>
        </View>
      </StyledScrollViewContainer>

      {/* ---- Spara ----
          Inte absolut som detaljsidans knapp: den ska följa med upp när
          tangentbordet öppnas, och det gör den bara som ett vanligt barn till
          KeyboardAvoidingView. */}
      <View
        className={`gap-2 bg-background px-4 pt-3 ${isKeyboardVisible ? "pb-3" : "pb-safe-offset-3"}`}
      >
        <FieldError isInvalid={!!errors.root}>{errors.root?.message}</FieldError>
        {/* Spärrad under uppladdning: image_path sätts först när filen
            finns, så en sparning nu hade tappat bilden. */}
        <Button
          size="lg"
          isDisabled={isPending || image.isUploading}
          onPress={onSave}
        >
          <StyledIonicons
            name="checkmark"
            size={20}
            className="text-accent-foreground"
          />
          <Button.Label>{saveLabel}</Button.Label>
        </Button>
      </View>

      {/* ---- Stäng, över bilden ---- */}
      <View className="absolute inset-x-0 top-0 flex-row px-4 pt-safe-offset-2">
        <RoundButton icon="close" label="Stäng" onPress={() => router.back()} />
      </View>
    </KeyboardAvoidingView>
  );
};

export default RecipeFormScreen;
