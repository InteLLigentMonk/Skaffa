import { useAuth } from "@/contexts/auth-context";
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

const VerifyEmail = () => {
  const otpRef = useRef<InputOTPRef>(null);

  const { validateEmail, loading, resendSignupVerification, user } = useAuth();
  const { email, codeSent } = useLocalSearchParams<{
    email?: string;
    codeSent?: string;
  }>();
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
  // Registration sends a code on the way here, so the cooldown starts. Coming
  // from login nothing was sent, and making them wait to ask would strand them.
  const { seconds, isCoolingDown, restart } = useResendCooldown(
    60_000,
    codeSent === "1",
  );

  const emailToVerify = email ?? user?.email;
  if (!emailToVerify) return <Redirect href="/login" />;

  const onSubmit: SubmitHandler<FormValues> = async ({ token }) => {
    try {
      await validateEmail(emailToVerify, token);
    } catch (error) {
      if (!isAuthError(error)) {
        console.error("Email validation failed:", error);
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

  const submit = handleSubmit(onSubmit);

  const onResend = async () => {
    try {
      await resendSignupVerification(emailToVerify);
      restart();
    } catch (error) {
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
          Verifiera din e-postadress
        </Typography.Heading>
        <Typography.Paragraph align="center" color="muted" type="body-sm">
          Vi har skickat en verifieringskod till{" "}
          <Typography.Paragraph weight="bold">
            {emailToVerify}
          </Typography.Paragraph>
          . Ange koden nedan för att slutföra registreringen.
        </Typography.Paragraph>
        <Controller
          control={control}
          name="token"
          rules={{
            required: "Verifieringskoden är obligatorisk.",
            minLength: {
              value: 6,
              message: "Verifieringskoden måste vara 6 siffror lång.",
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
                  submit();
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

export default VerifyEmail;
