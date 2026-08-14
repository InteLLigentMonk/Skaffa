import { Ionicons } from "@expo/vector-icons";
import { FieldError, Input, Label, TextField } from "heroui-native";
import { RefObject, useRef, useState } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import {
  Pressable,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { withUniwind } from "uniwind";

const StyledIonicons = withUniwind(Ionicons);

// Shared by register, settings and the recovery screen so the password rules,
// the matching check and the reveal toggle are defined once.
export type PasswordFieldValues = {
  password: string;
  confirmPassword: string;
};

type SecureInputProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  inputRef?: RefObject<TextInput | null>;
  // "next" hands focus on; "done" submits the form.
  returnKeyType: "next" | "done";
  onSubmitEditing?: () => void;
  // Defaults suit a new password; override for a current-password field so the
  // password manager offers the saved one instead of generating a new one.
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
};

// Exported so screens with an extra password field render it identically.
export const SecureInput = ({
  placeholder,
  value,
  onChangeText,
  onBlur,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  autoComplete = "new-password",
  textContentType = "newPassword",
}: SecureInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className="w-full flex-row items-center">
      <Input
        ref={inputRef}
        className="flex-1 px-10"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        // Keeps the keyboard up while moving to the next field.
        submitBehavior={returnKeyType === "next" ? "submit" : undefined}
        onSubmitEditing={onSubmitEditing}
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
        onPress={() => setIsVisible(!isVisible)}
      >
        <StyledIonicons
          name={isVisible ? "eye-off-outline" : "eye-outline"}
          size={16}
          className="text-muted"
        />
      </Pressable>
    </View>
  );
};

type PasswordFieldsProps<T extends FieldValues & PasswordFieldValues> = {
  control: Control<T>;
  // Drives both the label and the "är obligatoriskt" message, so "Nytt
  // lösenord" reads correctly on the change and recovery screens.
  label?: string;
  confirmLabel?: string;
  // Lets a preceding input hand focus to the first field.
  passwordRef?: RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
};

export const PasswordFields = <T extends FieldValues & PasswordFieldValues>({
  control,
  label = "Lösenord",
  confirmLabel = "Bekräfta lösenord",
  passwordRef,
  onSubmitEditing,
}: PasswordFieldsProps<T>) => {
  const confirmPasswordRef = useRef<TextInput>(null);

  return (
    <>
      <Controller
        control={control}
        name={"password" as Path<T>}
        rules={{
          required: `${label} är obligatoriskt`,
          minLength: {
            value: 6,
            message: "Lösenordet måste vara minst 6 tecken långt",
          },
          // Re-runs the matching check when this field changes.
          deps: ["confirmPassword"] as Path<T>[],
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <TextField isRequired isInvalid={!!fieldState.error}>
            <Label>{label}</Label>
            <SecureInput
              inputRef={passwordRef}
              placeholder={label}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        control={control}
        name={"confirmPassword" as Path<T>}
        rules={{
          required: `${confirmLabel} är obligatoriskt`,
          validate: (value, formValues) =>
            value === formValues.password || "Lösenorden matchar inte",
        }}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <TextField isRequired isInvalid={!!fieldState.error}>
            <Label>{confirmLabel}</Label>
            <SecureInput
              inputRef={confirmPasswordRef}
              placeholder={confirmLabel}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="done"
              onSubmitEditing={onSubmitEditing}
            />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
    </>
  );
};
