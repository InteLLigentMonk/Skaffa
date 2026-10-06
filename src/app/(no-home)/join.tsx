import { usePendingInvite } from "@/features/home/contexts/pending-invite-context";
import { useRedeemInvite } from "@/features/home/hooks/use-home";
import { useInvitePreview } from "@/features/home/hooks/use-invites";
import { parseInviteLink } from "@/lib/auth-links";
import { StyledIonicons } from "@/utils/helpers";
import { useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  Surface,
  TextField,
  Typography,
} from "heroui-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

// Se kommentaren i create-home.tsx.
const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";

/**
 * Inbjudan delas som en länk, men en skaffa://-länk är inte klickbar i de
 * flesta meddelandeappar och är död om appen inte är installerad. Därför tar
 * fältet både en hel länk och en naken token — klistrar användaren in länken
 * plockar vi ut token själva.
 */
const extractToken = (input: string) => {
  const trimmed = input.trim();
  return parseInviteLink(trimmed) ?? trimmed;
};

const JoinHome = () => {
  const params = useLocalSearchParams<{ token?: string }>();
  const pendingInvite = usePendingInvite();

  const initialToken = params.token ?? pendingInvite.token ?? "";
  const [input, setInput] = useState(initialToken);
  // Separat från input: frågan ska köras när användaren bett om det, inte vid
  // varje tangenttryck.
  const [lookup, setLookup] = useState<string | null>(
    initialToken ? extractToken(initialToken) : null,
  );
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const preview = useInvitePreview(lookup);
  const { mutate, isPending } = useRedeemInvite();
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      behavior={keyboardBehavior}
      className="flex-1"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        contentContainerClassName="grow gap-6 px-4 pt-6 pb-safe-offset-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Typography.Heading type="h2" weight="semibold">
            Gå med i ett hem
          </Typography.Heading>
          <Typography.Paragraph color="muted">
            Klistra in inbjudningslänken eller koden du fått.
          </Typography.Paragraph>
        </View>

        <TextField>
          <Label>Inbjudan</Label>
          <Input
            value={input}
            onChangeText={(text) => {
              setInput(text);
              setLookup(null);
              setRedeemError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="skaffa://join?token=… eller koden"
          />
        </TextField>

        <Button
          variant="tertiary"
          className="rounded-2xl bg-field"
          isDisabled={input.trim().length === 0 || preview.isFetching}
          onPress={() => setLookup(extractToken(input))}
        >
          <Typography.Heading type="h6" weight="bold">
            {preview.isFetching ? "Söker…" : "Hitta hemmet"}
          </Typography.Heading>
        </Button>

        {lookup && !preview.isFetching && (
          <>
            {preview.data ? (
              <Surface variant="secondary" className="gap-3">
                <View className="flex-row items-center gap-2">
                  <StyledIonicons
                    name="home-outline"
                    size={20}
                    className="text-accent"
                  />
                  <Typography.Heading type="h4" weight="semibold">
                    {preview.data.homeName}
                  </Typography.Heading>
                </View>
                <Typography.Paragraph type="body-sm" color="muted">
                  {preview.data.memberCount === 1
                    ? "1 medlem"
                    : `${preview.data.memberCount} medlemmar`}
                </Typography.Paragraph>
                <FieldError isInvalid={!!redeemError}>{redeemError}</FieldError>
                <Button
                  variant="primary"
                  isDisabled={isPending}
                  className="rounded-2xl"
                  onPress={() =>
                    // Ingen navigering: guarden i root-layouten flyttar oss
                    // när useHome refetchat.
                    mutate(lookup, {
                      onSuccess: () => pendingInvite.clear(),
                      onError: (error) =>
                        setRedeemError(
                          error.code === "P0001"
                            ? error.message
                            : "Kunde inte gå med, försök igen senare",
                        ),
                    })
                  }
                >
                  <Typography.Heading
                    type="h6"
                    weight="bold"
                    className="text-white"
                  >
                    {isPending ? "Går med…" : "Gå med"}
                  </Typography.Heading>
                </Button>
              </Surface>
            ) : (
              // peek_invite skiljer inte på ogiltig, återkallad och utgången —
              // svaret är detsamma, och att skilja dem gör den till ett orakel.
              <Surface className="flex-row items-start gap-2">
                <StyledIonicons
                  name="alert-circle-outline"
                  size={20}
                  className="text-danger"
                />
                <Typography.Paragraph
                  type="body-sm"
                  color="muted"
                  className="flex-1"
                >
                  Inbjudan är ogiltig eller har gått ut. Be om en ny länk.
                </Typography.Paragraph>
              </Surface>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default JoinHome;
