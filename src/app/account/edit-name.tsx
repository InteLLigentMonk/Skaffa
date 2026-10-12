import { useAuth } from "@/features/auth/contexts/auth-context";
import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { homeKeys } from "@/features/home/hooks/use-home";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from "heroui-native";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

type FormValues = {
  name: string;
};

const EditName = () => {
  const user = useAuthorizedUser();
  const { updateDisplayName } = useAuth();
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: user.name ?? "" },
  });

  const onSubmit: SubmitHandler<FormValues> = async ({ name }) => {
    try {
      await updateDisplayName(name.trim());
      // Medlemslistan läser profiles, som triggern just uppdaterat.
      await queryClient.invalidateQueries({ queryKey: homeKeys.all });
      router.back();
    } catch (error) {
      console.error("Error occurred while updating name:", error);
      setError("root", {
        message: "Det gick inte att byta namn. Försök igen senare.",
      });
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 justify-center gap-4 p-8 pb-safe-offset-8"
    >
      <Typography.Heading type="h1" align="center">
        Byt namn
      </Typography.Heading>
      <Typography.Paragraph align="center" color="muted" type="body-sm">
        Namnet syns för de andra i ditt hem.
      </Typography.Paragraph>

      <Controller
        control={control}
        name="name"
        rules={{
          validate: (value) =>
            value.trim().length > 0 || "Fältet får inte vara tomt",
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <TextField isRequired isInvalid={!!fieldState.error}>
            <Label>Namn</Label>
            <Input
              placeholder="Ditt namn"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={() => submit()}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <FieldError isInvalid={!!errors.root}>{errors.root?.message}</FieldError>

      <Button
        feedbackVariant="scale-ripple"
        isDisabled={isSubmitting}
        onPress={() => submit()}
      >
        {isSubmitting && (
          <ActivityIndicator
            size="small"
            color="white"
            className="absolute right-4"
          />
        )}
        <Button.Label>Spara</Button.Label>
      </Button>
    </KeyboardAvoidingView>
  );
};

export default EditName;
