import { useAuth } from "@/features/auth/contexts/auth-context";
import { useRouter } from "expo-router";
import {
    Button,
    FieldError,
    Input,
    Label,
    TextField,
} from "heroui-native";
import { Typography } from "heroui-native/text";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform } from "react-native";

const ForgotPassword = () => {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const { control, handleSubmit, setError, formState } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: { email: string }) => {
    try {
      await forgotPassword(data.email);
      // Supabase svarar likadant oavsett om adressen finns, så nästa steg
      // visas alltid — annars hade skärmen avslöjat vilka adresser som har konto.
      router.push({
        pathname: "/verify-reset",
        params: { email: data.email.trim() },
      });
    } catch (error) {
      console.error("Error occurred while requesting password reset:", error);
      setError("email", {
        type: "manual",
        message:
          "Det gick inte att skicka återställningskoden. Försök igen senare.",
      });
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 justify-center gap-4 p-8 pb-safe-offset-8"
    >
      <Typography.Heading type="h1" align="center" weight="bold">
        Glömt lösenord
      </Typography.Heading>

      <Controller
        control={control}
        name="email"
        rules={{
          required: "E-postadress krävs",
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: "Ogiltig e-postadress",
          },
        }}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <TextField isRequired isInvalid={!!error} className="w-full">
            <Label>E-postadress</Label>
            <Input
              placeholder="clark.kent@dailyplanet.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={submit}
            />
            <FieldError>{error?.message}</FieldError>
          </TextField>
        )}
      />
      <Button
        feedbackVariant="scale-ripple"
        isDisabled={formState.isSubmitting}
        onPress={submit}
      >
        Skicka återställningskod
      </Button>
    </KeyboardAvoidingView>
  );
};

export default ForgotPassword;
