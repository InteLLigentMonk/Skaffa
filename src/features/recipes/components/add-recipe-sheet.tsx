import DashedButton from "@/app/components/dashed-button";
import NumberSelect from "@/app/components/number-select";
import IngredientsPicker from "@/features/ingredients/components/ingredients-picker";
import { Ingredient, UNIT_LABELS } from "@/lib/types";
import { StyledIonicons } from "@/utils/helpers";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  Button,
  FieldError,
  Input,
  Label,
  Surface,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
} from "heroui-native";
import { useEffect, useState } from "react";
import { Control, Controller, useFieldArray, useForm } from "react-hook-form";
import {
  BackHandler,
  Keyboard,
  Platform,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipeFormValues, RecipeIngredientRow } from "../recipe-types";

const NameField = ({ control }: { control: Control<RecipeFormValues> }) => {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
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
            onFocus={onFocus}
            onBlur={(event) => {
              onBlur(event);
              field.onBlur();
            }}
          />
          <FieldError>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
};

const AmountField = ({
  control,
  index,
}: {
  control: Control<RecipeFormValues>;
  index: number;
}) => {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <Controller
      name={`ingredients.${index}.amount`}
      control={control}
      rules={{
        required: "Ange mängd",
        validate: (value) => {
          const n = Number(value.trim().replace(",", "."));
          return (Number.isFinite(n) && n > 0) || "Mängd måste vara ett nummer";
        },
      }}
      render={({ field, fieldState: { error } }) => (
        <TextField isRequired isInvalid={!!error}>
          <Input
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            onFocus={onFocus}
            onBlur={(event) => {
              onBlur(event);
              field.onBlur();
            }}
            className="w-32"
          />
          <FieldError>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
};

const AddRecipeSheet = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const [page, setPage] = useState<"form" | "picker" | "new-ingredient">(
    "form",
  );
  const [direction, setDirection] = useState<"forward" | "back">("back");
  const keyboardHeight = useSharedValue(0);

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const SHEET_HEIGHT = Math.round((windowHeight - insets.top) * 0.98);
  const HANDLE_HEIGHT = 45;
  const contentStyle = useAnimatedStyle(() => {
    const kb = keyboardHeight.get();
    return {
      height: SHEET_HEIGHT - HANDLE_HEIGHT - kb,
      paddingBottom: Math.max(insets.bottom - kb, 0),
    };
  });

  const goTo = (next: typeof page) => {
    setDirection("forward");
    setPage(next);
  };

  const goBack = () => {
    setDirection("back");
    if (page === "picker") setPage("form");
    else if (page === "new-ingredient") setPage("picker");
  };

  const entering = direction === "forward" ? SlideInRight : SlideInLeft;
  const exiting = direction === "back" ? SlideOutLeft : SlideOutRight;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecipeFormValues>({
    defaultValues: {
      servings: 1,
      name: "",
      ingredients: [
        { name: "Vitlök", amount: "2", unit: "styck" },
        { name: "Lök", amount: "1", unit: "styck" },
        { name: "Köttfärs", amount: "500", unit: "gram" },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
    rules: {
      required: "Lägg till minst en ingrediens",
    },
  });

  const onAdd = (ingredient: Ingredient) => {
    const row: RecipeIngredientRow = {
      ingredientId: ingredient.id,
      name: ingredient.name,
      amount: "1",
      unit: ingredient.unit,
    };
    append(row);
  };

  useEffect(() => {
    if (!isOpen) return;
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeight.set(
        withTiming(event.endCoordinates.height, { duration: 250 }),
      );
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.set(withTiming(0, { duration: 250 }));
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      keyboardHeight.set(0);
    };
  }, [isOpen]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!isOpen) return;

        if (page === "form") {
          setIsOpen(false);
          return true;
        } else if (page === "picker" || page === "new-ingredient") {
          goBack();
          return true;
        }
      },
    );
    return () => {
      backHandler.remove();
    };
  }, [page, setIsOpen, isOpen]);

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          keyboardBlurBehavior="restore"
          keyboardBehavior="extend"
          snapPoints={[SHEET_HEIGHT]}
          topInset={insets.top}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerProps={{
            style: { height: SHEET_HEIGHT - HANDLE_HEIGHT },
          }}
        >
          {page === "form" && (
            <Animated.View
              key="form"
              entering={entering}
              exiting={exiting}
              style={contentStyle}
              className="gap-4"
            >
              <View className="flex flex-row items-center justify-between">
                <BottomSheet.Title>
                  <Typography.Heading type="h2">Nytt recept</Typography.Heading>
                </BottomSheet.Title>
                <BottomSheet.Close className="rounded-lg" />
              </View>

              <BottomSheetScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="gap-4"
                className="flex-1"
              >
                <NameField control={control} />

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
                    <Button
                      variant="tertiary"
                      className="grow rounded-2xl bg-field"
                    >
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
                              <AmountField control={control} index={index} />
                              <Typography.Paragraph>
                                {UNIT_LABELS[row.unit]}
                              </Typography.Paragraph>
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
                      onPress={() => goTo("picker")}
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
                <Surface
                  variant="secondary"
                  className="flex-row items-start gap-2"
                >
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
                    Namn, minst en ingrediens och portioner räcker för att
                    spara. Bild + steg krävs bara om du vill publicera receptet.
                  </Typography.Paragraph>
                </Surface>
              </BottomSheetScrollView>
              <View className="flex-row items-center gap-2">
                <Button
                  size="lg"
                  variant="tertiary"
                  className="rounded-2xl bg-field"
                >
                  <Typography.Heading type="h3" weight="bold">
                    Steg
                  </Typography.Heading>
                </Button>
                <Button
                  size="lg"
                  className="flex-1 rounded-2xl"
                  onPress={handleSubmit((values) => console.log(values))}
                >
                  <Typography.Heading
                    type="h3"
                    weight="bold"
                    className="text-white"
                  >
                    Skapa recept
                  </Typography.Heading>
                </Button>
              </View>
            </Animated.View>
          )}
          {page === "picker" && (
            <Animated.View key="picker" entering={entering} exiting={exiting}>
              <IngredientsPicker onBack={goBack} onAdd={onAdd} />
            </Animated.View>
          )}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

export default AddRecipeSheet;
