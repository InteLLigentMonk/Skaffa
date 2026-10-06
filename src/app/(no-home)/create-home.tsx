import { useCreateHome } from "@/features/home/hooks/use-home";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

type CreateHomeValues = { name: string };

// padding på iOS, height på Android. Expo föreslår undefined för Android, men
// det räcker inte här: fönstret krymper (adjustResize) utan att något rullar
// knappen längst ner i bild. "position" flyttar innehållet utan att krympa den
// rullbara ytan, så toppen trycks ut ovanför skärmkanten — height krymper
// behållaren, vilket är det ScrollViewen behöver.
const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

const CreateHome = () => {
  const { mutate, isPending } = useCreateHome();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateHomeValues>({ defaultValues: { name: "" } });
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      className="flex-1"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentContainerClassName="grow gap-6 px-4 pt-6 pb-safe-offset-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Typography.Heading type="h2" weight="semibold">
            Skapa ett nytt hem
          </Typography.Heading>
          <Typography.Paragraph color="muted">
            Du blir ägare och kan bjuda in andra efteråt.
          </Typography.Paragraph>
        </View>

        <Controller
          control={control}
          name="name"
          rules={{ required: "Hemmet måste ha ett namn" }}
          render={({ field, fieldState: { error } }) => (
            <TextField isRequired isInvalid={!!error}>
              <Label>Namn</Label>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                autoCapitalize="sentences"
                placeholder="Hallgatan 8"
                returnKeyType="done"
              />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />

        <Surface variant="secondary" className="flex-row items-start gap-2">
          <Typography.Paragraph type="body-sm" color="muted" className="flex-1">
            Namnet syns bara för er som bor i hemmet, och du kan ändra det
            senare.
          </Typography.Paragraph>
        </Surface>

        <View className="grow justify-end gap-2">
          <FieldError isInvalid={!!errors.root}>
            {errors.root?.message}
          </FieldError>
          <Button
            variant="primary"
            isDisabled={isPending}
            className="rounded-2xl"
            onPress={handleSubmit(({ name }) =>
              // Ingen navigering här: Stack.Protected i root-layouten flyttar
              // oss när useHome refetchat och hemmet finns.
              mutate(name, {
                onError: (error) =>
                  setError("root", {
                    message:
                      error.code === "P0001"
                        ? error.message
                        : "Kunde inte skapa hemmet, försök igen senare",
                  }),
              }),
            )}
          >
            <Typography.Heading type="h6" weight="bold" className="text-white">
              {isPending ? "Skapar…" : "Skapa hem"}
            </Typography.Heading>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateHome;
