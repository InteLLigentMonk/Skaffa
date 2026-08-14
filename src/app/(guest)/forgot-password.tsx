import { useAuth } from "@/contexts/auth-context";
import {
  Alert,
  Button,
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native";
import { Typography } from "heroui-native/text";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();
  const { control, handleSubmit, setError, formState } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: { email: string }) => {
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch (error) {
      console.error("Error occurred while requesting password reset:", error);
      setError("email", {
        type: "manual",
        message:
          "Det gick inte att skicka återställningslänk. Försök igen senare.",
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

      {sent && (
        <Animated.View entering={FadeInDown} exiting={FadeOut}>
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Återställning skickad</Alert.Title>
              <Alert.Description>
                Om adressen finns hos oss har vi skickat en återställningslänk
                dit. Kontrollera din inkorg.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </Animated.View>
      )}

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
        Skicka återställningslänk
      </Button>
    </KeyboardAvoidingView>
  );
};

export default ForgotPassword;
