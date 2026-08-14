import {
  PasswordFields,
  SecureInput,
  type PasswordFieldValues,
} from "@/components/password-fields";
import { useAuth } from "@/contexts/auth-context";
import { isAuthError } from "@supabase/supabase-js";
import {
  Alert,
  Button,
  FieldError,
  Label,
  TextField,
  Typography,
} from "heroui-native";
import { useRef, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";

type FormValues = PasswordFieldValues & {
  currentPassword: string;
};

const ChangePassword = () => {
  const [sent, setSent] = useState(false);
  const { updateUser } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });
  const passwordRef = useRef<TextInput>(null);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await updateUser(data.password, data.currentPassword);
      reset();
      setSent(true);
    } catch (error) {
      if (!isAuthError(error)) {
        console.error("Error occurred while updating password:", error);
        setError("root", {
          message: "Det gick inte att uppdatera lösenordet. Försök igen senare.",
        });
        return;
      }

      switch (error.code) {
        // Only the verification sign-in can produce this, so it always means
        // the current password was wrong.
        case "invalid_credentials":
          setError("currentPassword", {
            message: "Fel lösenord.",
          });
          break;
        case "same_password":
          setError("password", {
            message: "Det nya lösenordet får inte vara samma som det gamla.",
          });
          break;
        case "weak_password":
          setError("password", {
            message:
              "Lösenordet är för svagt. Vänligen välj ett starkare lösenord.",
          });
          break;
        case "over_request_rate_limit":
          setError("root", {
            message: "För många försök. Vänta en stund och försök igen.",
          });
          break;
        default:
          console.error("Error occurred while updating password:", error);
          setError("root", {
            message:
              "Det gick inte att uppdatera lösenordet. Försök igen senare.",
          });
      }
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 justify-center gap-4 p-8 pb-safe-offset-8"
    >
      <Typography.Heading type="h1" align="center">
        Ändra lösenord
      </Typography.Heading>

      {sent && (
        <Animated.View entering={FadeInDown} exiting={FadeOut}>
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Lösenord ändrat</Alert.Title>
              <Alert.Description>
                Ditt lösenord har blivit ändrat.
              </Alert.Description>
            </Alert.Content>
            <Button variant="primary" onPress={() => setSent(false)}>
              Ok
            </Button>
          </Alert>
        </Animated.View>
      )}

      <Controller
        control={control}
        name="currentPassword"
        rules={{ required: "Fältet får inte vara tomt" }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <TextField isRequired isInvalid={!!fieldState.error}>
            <Label>Nuvarande lösenord</Label>
            <SecureInput
              placeholder="Nuvarande lösenord"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <PasswordFields
        control={control}
        label="Nytt lösenord"
        passwordRef={passwordRef}
        onSubmitEditing={() => submit()}
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
        <Button.Label>Ändra lösenord</Button.Label>
      </Button>
    </KeyboardAvoidingView>
  );
};

export default ChangePassword;
