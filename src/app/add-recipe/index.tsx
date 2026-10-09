import DashedButton from "@/components/dashed-button";
import ModalScreen from "@/components/modal-screen";
import NumberSelect from "@/components/number-select";
import { useHome } from "@/features/home/hooks/use-home";
import RecipeImageField from "@/features/recipes/components/recipe-image-field";
import {
  AmountField,
  NameField,
  PrepMinutesField,
  UnitField,
} from "@/features/recipes/components/recipe-form-fields";
import RecipeStepsField from "@/features/recipes/components/recipe-steps-field";
import { useRecipeImage } from "@/features/recipes/hooks/use-recipe-image";
import { useSaveRecipe } from "@/features/recipes/hooks/use-recipes";
import {
  deriveDiet,
  DIET_EMOJI,
  RecipeFormValues,
} from "@/features/recipes/recipe-types";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import {
  Button,
  CloseButton,
  FieldError,
  InputGroup,
  Label,
  Surface,
  Typography,
} from "heroui-native";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { View } from "react-native";
import { ScrollViewContainer } from "react-native-reorderable-list";
import { withUniwind } from "uniwind";

// Stegens draglista är nästlad i formulärets scroll. Biblioteket behöver sin
// egen ScrollView för att kunna skrolla formuläret när ett steg dras mot
// kanten.
const StyledScrollViewContainer = withUniwind(ScrollViewContainer);

const AddRecipeScreen = () => {
  const router = useRouter();
  const { data: home } = useHome();
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

  const image = useRecipeImage({
    homeId: home?.id,
    recipeId: getValues("id"),
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

  return (
    <ModalScreen>
      <View className="flex flex-row items-center justify-between">
        <Typography.Heading type="h3">Nytt recept</Typography.Heading>
        <CloseButton onPress={() => router.back()} className="rounded-lg" />
      </View>
      <StyledScrollViewContainer
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
        contentContainerClassName="gap-4"
      >
        <NameField />

        <View className="flex flex-row items-start gap-4">
          <View className="flex-1 gap-4">
            <View>
              <Label>Portioner</Label>
              <Controller
                control={control}
                name="servings"
                render={({ field }) => (
                  <NumberSelect {...field} min={1} max={20} />
                )}
              />
            </View>
            <PrepMinutesField />
          </View>
          <View>
            <Label>Bild</Label>
            <RecipeImageField
              image={image}
              placeholderEmoji={diet ? DIET_EMOJI[diet] : "🍽️"}
            />
          </View>
        </View>
        <View>
          <Label isRequired>Ingredienser</Label>
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
              onPress={() => router.push("/add-recipe/choose-ingredients")}
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
          <Typography.Paragraph type="body-sm" color="muted" className="flex-1">
            Namn, minst en ingrediens och portioner räcker för att spara. Bild +
            steg krävs bara om du vill publicera receptet.
          </Typography.Paragraph>
        </Surface>
      </StyledScrollViewContainer>
      <View className="gap-2">
        <FieldError isInvalid={!!errors.root}>
          {errors.root?.message}
        </FieldError>
        {/* Spärrad under uppladdning: image_path sätts först när filen
            finns, så en sparning nu hade tappat bilden. */}
        <Button
          isDisabled={isPending || image.isUploading}
          variant="primary"
          onPress={onSave}
          className="rounded-2xl"
        >
          <Typography.Heading type="h6" weight="bold" className="text-white">
            {image.isUploading ? "Laddar upp bild…" : "Spara recept"}
          </Typography.Heading>
        </Button>
      </View>
    </ModalScreen>
  );
};

export default AddRecipeScreen;
