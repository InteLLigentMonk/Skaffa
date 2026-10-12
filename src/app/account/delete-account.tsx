import { useAuth } from "@/features/auth/contexts/auth-context";
import { useHome, useHomeMembers } from "@/features/home/hooks/use-home";
import { PostgrestError } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

const CONFIRM_WORD = "RADERA";

// Vad som händer med hemmet avgörs av delete_account → leave_home i
// databasen. Texten här är bara en förhandsvisning av samma grenar.
const homeConsequence = (
  role: "owner" | "member" | undefined,
  memberCount: number | undefined,
  owners: number,
) => {
  if (memberCount === undefined) return null;
  if (memberCount === 1) {
    return "Du är ensam i hemmet, så hemmet raderas också – med recept, veckoplaner, inköpslistor och egna ingredienser.";
  }
  if (role === "owner" && owners === 1) {
    return "Du är hemmets enda ägare. Gör någon annan till ägare under Hantera hemmet innan du raderar kontot.";
  }
  return "Hemmet och dess recept blir kvar hos de andra medlemmarna.";
};

const DeleteAccount = () => {
  const { deleteAccount } = useAuth();
  const { data: home } = useHome();
  const members = useHomeMembers(home?.id);
  const [confirm, setConfirm] = useState("");

  const remove = useMutation<void, PostgrestError, void>({
    mutationFn: deleteAccount,
  });

  const owners = members.data?.filter((m) => m.role === "owner").length ?? 0;
  const consequence = homeConsequence(
    home?.role,
    members.data?.length,
    owners,
  );

  const errorMessage = remove.error
    ? remove.error.code === "P0001"
      ? remove.error.message
      : "Det gick inte att radera kontot. Försök igen senare."
    : null;

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
          Radera konto
        </Typography.Heading>

        <Typography.Paragraph type="body-sm" color="muted">
          Ditt konto, ditt namn och din inloggning tas bort permanent. Det går
          inte att ångra.
        </Typography.Paragraph>
        {consequence && (
          <Typography.Paragraph type="body-sm" color="muted">
            {consequence}
          </Typography.Paragraph>
        )}
        <Typography.Paragraph type="body-sm" color="muted">
          Skriv{" "}
          <Typography.Paragraph type="body-sm" weight="bold">
            {CONFIRM_WORD}
          </Typography.Paragraph>{" "}
          för att bekräfta.
        </Typography.Paragraph>

        <TextField isInvalid={!!errorMessage}>
          <Label>Bekräfta</Label>
          <Input
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={CONFIRM_WORD}
          />
          <FieldError>{errorMessage}</FieldError>
        </TextField>

        <Button
          variant="tertiary"
          className="rounded-2xl bg-danger-soft"
          isDisabled={remove.isPending || confirm.trim() !== CONFIRM_WORD}
          onPress={() => remove.mutate()}
        >
          <Typography.Paragraph className="text-danger">
            {remove.isPending ? "Raderar…" : "Radera mitt konto"}
          </Typography.Paragraph>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DeleteAccount;
