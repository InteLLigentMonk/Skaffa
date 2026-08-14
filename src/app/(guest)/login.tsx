import { useAuth } from "@/contexts/auth-context";
import { isAuthError } from "@supabase/supabase-js";
import { Link, useRouter } from "expo-router";
import { Alert, Button } from "heroui-native";
import { FieldError } from "heroui-native/field-error";
import { Input } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { Typography } from "heroui-native/text";
import { TextField } from "heroui-native/text-field";
import { useRef } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";

type FormValues = {
  email: string;
  password: string;
};

const Login = () => {
  const { login, recoveryError, clearRecoveryError } = useAuth();
  const router = useRouter();

  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      // isAuthError over instanceof: the latter fails if two copies of the
      // supabase package end up in the bundle.
      if (!isAuthError(error)) {
        console.error("Login failed:", error);
        setError("root", {
          message:
            "Det gick inte att logga in. Kontrollera din anslutning och försök igen.",
        });
        return;
      }

      switch (error.code) {
        case "invalid_credentials":
          setError("password", {
            type: "manual",
            message: "Ogiltig e-postadress eller lösenord.",
          });
          break;
        case "email_not_confirmed":
          // Without this the verification screen is unreachable after an app
          // restart, and the address is already taken so they cannot register
          // again either. No codeSent param — nothing was sent just now, so the
          // resend button must be available immediately.
          router.push({
            pathname: "/verify-email",
            params: { email: data.email.trim() },
          });
          break;
        default:
          console.error("Login failed:", error);
          setError("root", {
            message: "Det gick inte att logga in. Försök igen senare.",
          });
      }
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="grow gap-5 p-8 justify-center"
        keyboardShouldPersistTaps="handled"
      >
        <Typography.Heading type="h1" align="center" weight="bold">
          Logga in
        </Typography.Heading>

        {recoveryError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Återställning misslyckades</Alert.Title>
              <Alert.Description>{recoveryError}</Alert.Description>
            </Alert.Content>
            <Button variant="primary" onPress={clearRecoveryError}>
              Ok
            </Button>
          </Alert>
        )}

        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email är obligatoriskt",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Ogiltig e-postadress",
            },
          }}
          render={({ field, fieldState }) => (
            <TextField isRequired isInvalid={!!fieldState.error}>
              <Label>Email</Label>
              <Input
                placeholder="exempel@domän.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: "Lösenord är obligatoriskt",
          }}
          render={({ field, fieldState }) => (
            <TextField isRequired isInvalid={!!fieldState.error}>
              <Label>Lösenord</Label>
              <Input
                placeholder="Lösenord"
                secureTextEntry
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={submit}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
        <FieldError isInvalid={!!errors.root}>
          {errors.root?.message}
        </FieldError>
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
          <Button.Label>Logga in</Button.Label>
        </Button>
        <Link href="/register">
          <Typography.Paragraph type="body-sm" align="center">
            Har du inget konto? Registrera dig.
          </Typography.Paragraph>
        </Link>
        <Link href="/forgot-password">
          <Typography.Paragraph type="body-sm" align="center">
            Glömt lösenord?
          </Typography.Paragraph>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Login;
