import {
  PasswordFields,
  type PasswordFieldValues,
} from "@/components/password-fields";
import { useAuth } from "@/contexts/auth-context";
import { isAuthError } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { Button } from "heroui-native/button";
import { Description } from "heroui-native/description";
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

type FormValues = PasswordFieldValues & {
  displayName: string;
  email: string;
};

const Register = () => {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const router = useRouter();
  const { register } = useAuth();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const { emailTaken, needsVerification } = await register(
        data.email.trim(),
        data.password,
        data.displayName.trim(),
      );

      if (emailTaken) {
        setError("email", {
          type: "manual",
          message: "E-postadressen används redan",
        });
        return;
      }

      if (needsVerification) {
        router.replace({
          pathname: "/verify-email",
          // Signing up just sent a code, so the resend cooldown starts here.
          params: { email: data.email.trim(), codeSent: "1" },
        });
      }
    } catch (error) {
      if (!isAuthError(error)) {
        console.error(error);
        setError("root", {
          type: "manual",
          message: "Ett fel uppstod, vänligen försök igen.",
        });
        return;
      }

      switch (error.code) {
        case "user_already_exists":
        case "email_exists":
          setError("email", {
            type: "manual",
            message: "E-postadressen används redan",
          });
          break;
        case "email_address_invalid":
          setError("email", {
            type: "manual",
            message: "Ogiltig e-postadress",
          });
          break;
        case "weak_password":
          setError("password", {
            type: "manual",
            message: "Lösenordet är för svagt",
          });
          break;
        case "over_email_send_rate_limit":
          setError("email", {
            type: "manual",
            message: "För många försök. Vänta en stund och försök igen.",
          });
          break;
        default:
          console.error(error);
          setError("root", {
            type: "manual",
            message: "Ett fel uppstod, vänligen försök igen.",
          });
      }
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 pb-safe-offset-8"
    >
      <ScrollView
        contentContainerClassName="grow gap-5 p-8  justify-center"
        keyboardShouldPersistTaps="handled"
      >
        <Typography.Heading type="h1" align="center" weight="bold">
          Registrera dig
        </Typography.Heading>
        <Controller
          control={control}
          name="displayName"
          rules={{
            required: "Namn är obligatoriskt",
          }}
          render={({ field, fieldState }) => (
            <TextField isRequired isInvalid={!!fieldState.error}>
              <Label>Namn</Label>
              <Input
                placeholder="Ditt namn"
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
              <Description hideOnInvalid>
                Detta namn kommer att visas för andra användare.
              </Description>
            </TextField>
          )}
        />

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
                ref={emailRef}
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
              <Description hideOnInvalid>
                Vi kommer aldrig att dela din e-postadress med tredje part.
              </Description>
            </TextField>
          )}
        />

        <PasswordFields
          control={control}
          passwordRef={passwordRef}
          onSubmitEditing={() => submit()}
        />

        {errors.root && (
          <FieldError isInvalid>{errors.root.message}</FieldError>
        )}
        <Button isDisabled={isSubmitting} onPress={() => submit()}>
          {isSubmitting && (
            <ActivityIndicator
              size="small"
              color="white"
              className="absolute right-4"
            />
          )}
          <Button.Label>Registrera dig</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;
