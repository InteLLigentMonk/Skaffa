import { useAuth } from "@/contexts/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { isAuthError } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { Button } from "heroui-native/button";
import { Description } from "heroui-native/description";
import { FieldError } from "heroui-native/field-error";
import { Input } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { Typography } from "heroui-native/text";
import { TextField } from "heroui-native/text-field";
import { useRef, useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";
import { withUniwind } from "uniwind";

const StyledIonicons = withUniwind(Ionicons);

type FormValues = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const Register = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
      const { emailTaken } = await register(
        data.email,
        data.password,
        data.displayName,
      );

      if (emailTaken) {
        setError("email", {
          type: "manual",
          message: "E-postadressen används redan",
        });
        return;
      }

      router.replace("/verify-email");
    } catch (error) {
      if (!isAuthError(error)) {
        console.error(error);
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
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <FieldError>{fieldState.error?.message}</FieldError>
              <Description hideOnInvalid>
                Vi kommer aldrig att dela din e-postadress med tredje part.
              </Description>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: "Lösenord är obligatoriskt",
            minLength: {
              value: 6,
              message: "Lösenordet måste vara minst 6 tecken långt",
            },
            deps: ["confirmPassword"],
          }}
          render={({ field, fieldState }) => (
            <TextField isRequired isInvalid={!!fieldState.error}>
              <Label>Lösenord</Label>
              <View className="w-full flex-row items-center">
                <Input
                  ref={passwordRef}
                  className="flex-1 px-10"
                  placeholder="Ditt lösenord"
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  value={field.value}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
                <StyledIonicons
                  name="lock-closed-outline"
                  size={16}
                  pointerEvents="none"
                  className="absolute left-3.5 text-muted"
                />
                <Pressable
                  className="absolute right-4"
                  hitSlop={8}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  <StyledIonicons
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    className="text-muted"
                  />
                </Pressable>
              </View>
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: "Bekräfta lösenord är obligatoriskt",
            validate: (value, formValues) =>
              value === formValues.password || "Lösenorden matchar inte",
          }}
          render={({ field, fieldState }) => (
            <TextField isRequired isInvalid={!!fieldState.error}>
              <Label>Bekräfta lösenord</Label>
              <View className="w-full flex-row items-center">
                <Input
                  ref={confirmPasswordRef}
                  className="flex-1 px-10"
                  placeholder="Bekräfta ditt lösenord"
                  secureTextEntry={!isConfirmPasswordVisible}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onSubmitEditing={() => submit()}
                />
                <StyledIonicons
                  name="lock-closed-outline"
                  size={16}
                  pointerEvents="none"
                  className="absolute left-3.5 text-muted"
                />
                <Pressable
                  className="absolute right-4"
                  hitSlop={8}
                  onPress={() =>
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                  }
                >
                  <StyledIonicons
                    name={
                      isConfirmPasswordVisible
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={16}
                    className="text-muted"
                  />
                </Pressable>
              </View>
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
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
