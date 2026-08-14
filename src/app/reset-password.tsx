import {
  PasswordFields,
  type PasswordFieldValues,
} from "@/components/password-fields";
import { useAuth } from "@/contexts/auth-context";
import { isAuthError } from "@supabase/supabase-js";
import { Button, FieldError, Typography } from "heroui-native";
import { SubmitHandler, useForm } from "react-hook-form";
import { ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";

// Reached only through a recovery link — the root guard swaps the whole app for
// this screen. No current password is asked for here: the user is on this
// screen precisely because they do not know it.
const ResetPassword = () => {
  const { updateUser } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFieldValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<PasswordFieldValues> = async (data) => {
    try {
      // On success the recovery flag clears and the root guard drops the user
      // into the app, so there is nothing to navigate to from here.
      await updateUser(data.password, null);
    } catch (error) {
      if (!isAuthError(error)) {
        console.error("Error occurred while resetting password:", error);
        setError("root", {
          message: "Det gick inte att spara lösenordet. Försök igen senare.",
        });
        return;
      }

      switch (error.code) {
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
        case "session_expired":
          setError("root", {
            message:
              "Återställningen har gått ut. Begär en ny länk och försök igen.",
          });
          break;
        default:
          console.error("Error occurred while resetting password:", error);
          setError("root", {
            message: "Det gick inte att spara lösenordet. Försök igen senare.",
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
      <Typography.Heading type="h1" align="center" weight="bold">
        Välj nytt lösenord
      </Typography.Heading>
      <Typography.Paragraph align="center" color="muted" type="body-sm">
        Ange ett nytt lösenord för ditt konto. Du loggas in direkt efteråt.
      </Typography.Paragraph>

      <PasswordFields
        control={control}
        label="Nytt lösenord"
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
        <Button.Label>Spara lösenord</Button.Label>
      </Button>
    </KeyboardAvoidingView>
  );
};

export default ResetPassword;
