import DashedButton from "@/components/dashed-button";
import ModalScreen from "@/components/modal-screen";
import NumberSelect from "@/components/number-select";
import {
  AmountField,
  NameField,
  UnitField,
} from "@/features/recipes/components/recipe-form-fields";
import { RecipeFormValues } from "@/features/recipes/recipe-types";
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
import { ScrollView, View } from "react-native";
const AddRecipeScreen = () => {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useFormContext<RecipeFormValues>();
  const { fields, remove } = useFieldArray({
    control,
    name: "ingredients",
    rules: { required: "Lägg till minst en ingrediens" },
  });

  return (
    <ModalScreen>
      <View className="flex flex-row items-center justify-between">
        <Typography.Heading type="h3">Nytt recept</Typography.Heading>
        <CloseButton onPress={() => router.back()} className="rounded-lg" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="flex-1"
        contentContainerClassName="gap-4"
      >
        <NameField />

        <View className="flex flex-row items-center justify-between gap-4">
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
          <View className="flex-1">
            <Label>Bild</Label>
            <Button variant="tertiary" className="grow rounded-2xl bg-field">
              <StyledIonicons name="image-outline" size={20} />
              <Typography.Paragraph>Lägg till</Typography.Paragraph>
            </Button>
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
      </ScrollView>
      <View className="flex flex-row items-center justify-between gap-4">
        <Button variant="tertiary" className="rounded-2xl">
          <Typography.Heading type="h6" weight="bold">
            Steg
          </Typography.Heading>
        </Button>
        <Button
          variant="primary"
          onPress={handleSubmit((value) => console.log(value))}
          className="grow rounded-2xl"
        >
          <Typography.Heading type="h6" weight="bold" className="text-white">
            Spara recept
          </Typography.Heading>
        </Button>
      </View>
    </ModalScreen>
  );
};

export default AddRecipeScreen;
