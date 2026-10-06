import { useAuth } from "@/features/auth/contexts/auth-context";
import { usePendingInvite } from "@/features/home/contexts/pending-invite-context";
import { useHome } from "@/features/home/hooks/use-home";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { Button, Surface, Typography } from "heroui-native";
import { ScrollView, View } from "react-native";

const NoHomeIndex = () => {
  const router = useRouter();
  const auth = useAuth();
  const { isError, refetch, isFetching } = useHome();
  const pendingInvite = usePendingInvite();

  // Ett nätverksfel gör isPending falsk, så gatingen skickar även den som HAR
  // ett hem hit. Utan den här grenen hade vi bett henne skapa ett nytt.
  if (isError) {
    return (
      <View className="flex-1 justify-center gap-4 p-safe-offset-8">
        <StyledIonicons
          name="cloud-offline-outline"
          size={48}
          className="text-muted self-center"
        />
        <Typography.Heading type="h3" className="text-center">
          Kunde inte läsa ditt hem
        </Typography.Heading>
        <Typography.Paragraph color="muted" className="text-center">
          Kontrollera din uppkoppling och försök igen. Har du redan ett hem
          finns det kvar.
        </Typography.Paragraph>
        <Button
          variant="primary"
          isDisabled={isFetching}
          onPress={() => refetch()}
          className="rounded-2xl"
        >
          <Typography.Heading type="h6" weight="bold" className="text-white">
            {isFetching ? "Försöker…" : "Försök igen"}
          </Typography.Heading>
        </Button>
        <Button variant="tertiary" onPress={() => auth.logout()}>
          <Typography.Paragraph color="muted">Logga ut</Typography.Paragraph>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerClassName="grow justify-center gap-6 p-safe-offset-8">
      <View className="gap-2">
        <Typography.Heading type="h1" weight="semibold">
          Välkommen till Skaffa
        </Typography.Heading>
        <Typography.Paragraph color="muted">
          Allt i Skaffa — recept, veckoplan och inköpslista — delas i ett hem.
          Skapa ett eget eller gå med i någon annans.
        </Typography.Paragraph>
      </View>

      {pendingInvite.token && (
        <Surface variant="secondary" className="gap-3">
          <View className="flex-row items-center gap-2">
            <StyledIonicons
              name="mail-unread-outline"
              size={20}
              className="text-accent"
            />
            <Typography.Heading type="h5" weight="bold">
              Du har en inbjudan
            </Typography.Heading>
          </View>
          <Typography.Paragraph type="body-sm" color="muted">
            Någon har bjudit in dig till sitt hem.
          </Typography.Paragraph>
          <Button
            variant="primary"
            onPress={() => router.push("/join")}
            className="rounded-2xl"
          >
            <Typography.Heading type="h6" weight="bold" className="text-white">
              Visa inbjudan
            </Typography.Heading>
          </Button>
        </Surface>
      )}

      <View className="gap-3">
        <Button
          variant="primary"
          onPress={() => router.push("/create-home")}
          className="rounded-2xl"
        >
          <StyledIonicons name="home-outline" size={20} color="white" />
          <Typography.Heading type="h6" weight="bold" className="text-white">
            Skapa ett hem
          </Typography.Heading>
        </Button>
        <Button
          variant="tertiary"
          onPress={() => router.push("/join")}
          className="rounded-2xl bg-field"
        >
          <StyledIonicons name="enter-outline" size={20} />
          <Typography.Heading type="h6" weight="bold">
            Gå med i ett hem
          </Typography.Heading>
        </Button>
      </View>

      <Button variant="tertiary" onPress={() => auth.logout()}>
        <Typography.Paragraph color="muted">
          Logga ut{auth.user?.email ? ` (${auth.user.email})` : ""}
        </Typography.Paragraph>
      </Button>
    </ScrollView>
  );
};

export default NoHomeIndex;
