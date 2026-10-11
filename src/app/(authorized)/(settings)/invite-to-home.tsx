import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { useHome } from "@/features/home/hooks/use-home";
import {
  useCreateInvite,
  useInvites,
  useRevokeInvite,
} from "@/features/home/hooks/use-invites";
import { buildInviteLink } from "@/lib/auth-links";
import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  FieldError,
  Label,
  Separator,
  Surface,
  Typography,
} from "heroui-native";
import { ActivityIndicator, ScrollView, Share, View } from "react-native";

const formatExpiry = (iso: string) => {
  const days = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "går ut idag";
  return days === 1 ? "går ut imorgon" : `går ut om ${days} dagar`;
};

const InviteToHome = () => {
  const user = useAuthorizedUser();
  const { data: home, isPending: homePending } = useHome();
  const invites = useInvites(home?.id);
  const create = useCreateInvite();
  const revoke = useRevokeInvite();

  if (homePending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // null, inte undefined: hemmet är borta och guarden flyttar oss.
  if (!home) return null;

  const share = async (token: string) => {
    const link = buildInviteLink(token);
    try {
      await Share.share({
        message: `Gå med i vårt hem "${home.name}" i Skaffa:\n${link}`,
      });
    } catch {
      // Användaren avbröt delningen — inget att rapportera.
    }
  };

  return (
    <ScrollView contentContainerClassName="grow gap-6 px-4 py-6">
      <View className="gap-2">
        <Typography.Heading type="h2" weight="semibold">
          Bjud in till {home.name}
        </Typography.Heading>
        <Typography.Paragraph color="muted">
          En inbjudan gäller i 7 dagar och kan användas av flera personer. Den
          som går med blir medlem, inte ägare.
        </Typography.Paragraph>
      </View>

      <View className="gap-2">
        <FieldError isInvalid={!!create.error}>
          {create.error?.code === "P0001"
            ? create.error.message
            : create.error
              ? "Kunde inte skapa inbjudan"
              : null}
        </FieldError>
        <Button
          variant="primary"
          className="rounded-2xl"
          isDisabled={create.isPending}
          onPress={() =>
            create.mutate(
              { homeId: home.id, userId: user.id },
              { onSuccess: (invite) => share(invite.token) },
            )
          }
        >
          <StyledIonicons name="add-outline" size={20} color="white" />
          <Typography.Heading type="h6" weight="bold" className="text-white">
            {create.isPending ? "Skapar…" : "Skapa inbjudan"}
          </Typography.Heading>
        </Button>
      </View>

      <Separator />

      <View className="gap-2">
        <Label>Aktiva inbjudningar</Label>

        {invites.isPending && <ActivityIndicator />}
        {invites.isError && (
          <Typography.Paragraph type="body-sm" color="muted">
            Kunde inte läsa inbjudningarna.
          </Typography.Paragraph>
        )}
        {invites.data?.length === 0 && (
          <Typography.Paragraph type="body-sm" color="muted">
            Inga aktiva inbjudningar.
          </Typography.Paragraph>
        )}

        <FieldError isInvalid={!!revoke.error}>
          {revoke.error ? "Kunde inte återkalla inbjudan" : null}
        </FieldError>

        {invites.data?.map((invite) => (
          <Surface key={invite.id} className="gap-3">
            {/* Koden visas som markerbar text — expo-clipboard finns inte i
                projektet, så en kopiera-knapp hade krävt ett nytt beroende. */}
            <View className="gap-1">
              <Typography.Paragraph
                selectable
                weight="bold"
                className="font-mono"
              >
                {invite.token}
              </Typography.Paragraph>
              <Typography.Paragraph type="body-sm" color="muted">
                {formatExpiry(invite.expiresAt)}
              </Typography.Paragraph>
            </View>
            <View className="flex-row gap-2">
              <Button
                variant="tertiary"
                className="flex-1 rounded-xl bg-field"
                onPress={() => share(invite.token)}
              >
                <StyledIonicons name="share-outline" size={16} />
                <Typography.Paragraph type="body-sm">Dela</Typography.Paragraph>
              </Button>
              <Button
                variant="tertiary"
                className="flex-1 rounded-xl bg-danger-soft"
                isDisabled={revoke.isPending}
                onPress={() =>
                  revoke.mutate({ inviteId: invite.id, homeId: home.id })
                }
              >
                <Typography.Paragraph type="body-sm" className="text-danger">
                  Återkalla
                </Typography.Paragraph>
              </Button>
            </View>
          </Surface>
        ))}
      </View>
    </ScrollView>
  );
};

export default InviteToHome;
