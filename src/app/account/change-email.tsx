import { useAuth } from "@/features/auth/contexts/auth-context";
import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { isAuthError } from "@supabase/supabase-js";
import { router } from "expo-router";
import {
  Button,
  FieldError,
  Input,
  InputOTP,
  Label,
  LinkButton,
  REGEXP_ONLY_DIGITS,
  TextField,
  Typography,
  type InputOTPRef,
} from "heroui-native";
import { useRef, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

// Två steg på samma skärm: först den nya adressen, sedan koden. Med "Secure
// email change" påslaget i Supabase kommer ett tredje — koden till den
// nuvarande adressen. Steget bär adressen koden ska verifieras mot.
type Step =
  | { kind: "address" }
  | { kind: "code"; newEmail: string; verifyAgainst: string };

const AddressStep = ({
  onSent,
}: {
  onSent: (newEmail: string) => void;
}) => {
  const user = useAuthorizedUser();
  const { requestEmailChange } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } });

  const onSubmit: SubmitHandler<{ email: string }> = async ({ email }) => {
    const newEmail = email.trim().toLowerCase();
    try {
      await requestEmailChange(newEmail);
      onSent(newEmail);
    } catch (error) {
      if (isAuthError(error)) {
        switch (error.code) {
          case "email_exists":
            setError("email", {
              message: "Adressen används redan av ett annat konto.",
            });
            return;
          case "email_address_invalid":
          case "validation_failed":
            setError("email", { message: "Ogiltig e-postadress." });
            return;
          case "over_email_send_rate_limit":
          case "over_request_rate_limit":
            setError("root", {
              message: "För många försök. Vänta en stund och försök igen.",
            });
            return;
        }
      }
      console.error("Error occurred while requesting email change:", error);
      setError("root", {
        message: "Det gick inte att byta adress. Försök igen senare.",
      });
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <>
      <Typography.Paragraph align="center" color="muted" type="body-sm">
        Nuvarande adress:{" "}
        <Typography.Paragraph type="body-sm" weight="bold">
          {user.email}
        </Typography.Paragraph>
        . Vi skickar en kod till den nya adressen.
      </Typography.Paragraph>

      <Controller
        control={control}
        name="email"
        rules={{
          required: "Fältet får inte vara tomt",
          validate: (value) =>
            value.trim().toLowerCase() !== user.email.toLowerCase() ||
            "Det är redan din adress.",
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <TextField isRequired isInvalid={!!fieldState.error}>
            <Label>Ny e-postadress</Label>
            <Input
              placeholder="namn@exempel.se"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
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
        <Button.Label>Skicka kod</Button.Label>
      </Button>
    </>
  );
};

const CodeStep = ({
  newEmail,
  verifyAgainst,
  onNeedsOther,
}: {
  newEmail: string;
  verifyAgainst: string;
  onNeedsOther: (other: string) => void;
}) => {
  const user = useAuthorizedUser();
  const { confirmEmailChange, resendEmailChange, loading } = useAuth();
  const otpRef = useRef<InputOTPRef>(null);
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ token: string }>({ defaultValues: { token: "" } });
  const { seconds, isCoolingDown, restart } = useResendCooldown();

  const onSubmit: SubmitHandler<{ token: string }> = async ({ token }) => {
    try {
      const done = await confirmEmailChange(verifyAgainst, token);
      if (done) {
        Alert.alert("Klart", `Din e-postadress är nu ${newEmail}.`);
        router.back();
        return;
      }
      // Den här koden godtogs, men Supabase vill ha den andra också.
      reset();
      onNeedsOther(verifyAgainst === newEmail ? user.email : newEmail);
    } catch (error) {
      if (isAuthError(error) && error.code === "otp_expired") {
        setError("token", {
          message: "Koden är ogiltig eller har gått ut. Begär en ny kod.",
        });
        otpRef.current?.clear();
        otpRef.current?.focus();
        return;
      }
      if (isAuthError(error) && error.code === "over_request_rate_limit") {
        setError("root", {
          message: "För många försök. Vänta en stund och försök igen.",
        });
        return;
      }
      console.error("Error occurred while confirming email change:", error);
      setError("root", { message: "Kunde inte verifiera koden." });
    }
  };

  const onResend = async () => {
    try {
      await resendEmailChange(newEmail);
      restart();
    } catch {
      restart(); // spärra även vid fel — servern har ändå räknat försöket
      setError("root", { message: "Kunde inte skicka en ny kod." });
    }
  };

  return (
    <>
      <Typography.Paragraph align="center" color="muted" type="body-sm">
        Ange koden vi skickade till{" "}
        <Typography.Paragraph type="body-sm" weight="bold">
          {verifyAgainst}
        </Typography.Paragraph>
        .
      </Typography.Paragraph>

      <Controller
        control={control}
        name="token"
        rules={{
          required: "Koden är obligatorisk.",
          minLength: { value: 6, message: "Koden är 6 siffror lång." },
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

      <FieldError isInvalid={!!errors.root}>{errors.root?.message}</FieldError>
      <LinkButton isDisabled={isCoolingDown || isSubmitting} onPress={onResend}>
        {isCoolingDown ? `Skicka ny kod om ${seconds} s` : "Skicka ny kod"}
      </LinkButton>
    </>
  );
};

const ChangeEmail = () => {
  const [step, setStep] = useState<Step>({ kind: "address" });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="grow justify-center gap-4 p-8 pb-safe-offset-8"
        keyboardShouldPersistTaps="handled"
      >
        <Typography.Heading type="h1" align="center">
          Byt e-postadress
        </Typography.Heading>

        {step.kind === "address" ? (
          <AddressStep
            onSent={(newEmail) =>
              setStep({ kind: "code", newEmail, verifyAgainst: newEmail })
            }
          />
        ) : (
          <CodeStep
            // key: ett nytt steg ska börja med tomt fält och ny nedräkning.
            key={step.verifyAgainst}
            newEmail={step.newEmail}
            verifyAgainst={step.verifyAgainst}
            onNeedsOther={(other) =>
              setStep({
                kind: "code",
                newEmail: step.newEmail,
                verifyAgainst: other,
              })
            }
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChangeEmail;
