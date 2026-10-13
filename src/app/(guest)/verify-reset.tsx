import { useAuth } from "@/features/auth/contexts/auth-context";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { isAuthError } from "@supabase/supabase-js";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  FieldError,
  InputOTP,
  LinkButton,
  REGEXP_ONLY_DIGITS,
  Typography,
  type InputOTPRef,
} from "heroui-native";
import { useRef } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

type FormValues = {
  token: string;
};

// Andra steget i "Glömt lösenord". Koden byts mot en session och
// isRecoverySession slås på; guarden i root-layouten byter då hela appen mot
// reset-password, så den här skärmen navigerar inte själv vidare.
//
// Kod i stället för länk: en länk bar access- och refresh-token i en
// skaffa://-URL, och den kan en annan app på Android fånga.
const VerifyReset = () => {
  const otpRef = useRef<InputOTPRef>(null);

  const { verifyRecoveryCode, forgotPassword, loading } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      token: "",
    },
  });
  // forgot-password skickade just en kod, så nedräkningen startar direkt.
  const { seconds, isCoolingDown, restart } = useResendCooldown();

  if (!email) return <Redirect href="/forgot-password" />;

  const onSubmit: SubmitHandler<FormValues> = async ({ token }) => {
    try {
      await verifyRecoveryCode(email, token);
    } catch (error) {
      if (!isAuthError(error)) {
        console.error("Recovery code verification failed:", error);
        setError("root", { message: "Ett fel uppstod, vänligen försök igen." });
        return;
      }

      switch (error.code) {
        case "otp_expired":
          setError("token", {
            message:
              "Koden är ogiltig eller har gått ut. Vänligen begär en ny kod.",
          });
          otpRef.current?.clear();
          otpRef.current?.focus();
          break;
        case "over_request_rate_limit":
          setError("root", {
            message:
              "För många försök. Vänligen vänta en stund innan du försöker igen.",
          });
          break;
        default:
          setError("root", { message: "Kunde inte verifiera koden." });
      }
    }
  };

  const onResend = async () => {
    try {
      await forgotPassword(email);
      restart();
    } catch {
      restart(); // spärra även vid fel — servern har ändå räknat försöket
      setError("root", { message: "Kunde inte skicka en ny kod." });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="grow gap-5 p-8 justify-center items-center"
        keyboardShouldPersistTaps="handled"
      >
        <Typography.Heading type="h3" align="center" weight="bold">
          Ange återställningskoden
        </Typography.Heading>
        <Typography.Paragraph align="center" color="muted" type="body-sm">
          Om{" "}
          <Typography.Paragraph weight="bold">{email}</Typography.Paragraph>{" "}
          har ett konto hos oss har vi skickat en kod dit. Ange den nedan för
          att välja ett nytt lösenord.
        </Typography.Paragraph>
        <Controller
          control={control}
          name="token"
          rules={{
            required: "Koden är obligatorisk.",
            minLength: {
              value: 6,
              message: "Koden måste vara 6 siffror lång.",
            },
          }}
          render={({ field, fieldState }) => (
            <>
              <InputOTP
                ref={otpRef}
                maxLength={6}
                textInputProps={{ autoFocus: true }}
                pattern={REGEXP_ONLY_DIGITS}
                isInvalid={fieldState.invalid}
                value={field.value}
                onChange={field.onChange}
                onComplete={() => {
                  if (isSubmitting || loading) return;
                  handleSubmit(onSubmit)();
                }}
              >
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
              <FieldError isInvalid={fieldState.invalid}>
                {fieldState.error?.message}
              </FieldError>
            </>
          )}
        />

        <FieldError isInvalid={!!errors.root}>
          {errors.root?.message}
        </FieldError>
        <LinkButton isDisabled={isCoolingDown || loading} onPress={onResend}>
          {isCoolingDown ? `Skicka ny kod om ${seconds} s` : "Skicka ny kod"}
        </LinkButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VerifyReset;
