import { StyledIonicons } from "@/utils/helpers";
import { Button, Surface, Typography } from "heroui-native";
import { View } from "react-native";
import { usePendingInvite } from "../contexts/pending-invite-context";
import { useHome } from "../hooks/use-home";

/**
 * Öppnar någon som redan har ett hem en inbjudningslänk skickar guarden henne
 * hit, inte till join-skärmen — redeem_invite hade ändå kastat "Du är redan
 * med i ett hem". Bannern säger det i förväg i stället för att navigera till
 * ett garanterat fel.
 */
const PendingInviteBanner = () => {
  const { token, clear } = usePendingInvite();
  const { data: home } = useHome();

  if (!token || !home) return null;

  return (
    <Surface variant="secondary" className="mx-4 mb-2 gap-2">
      <View className="flex-row items-center gap-2">
        <StyledIonicons
          name="mail-unread-outline"
          size={20}
          className="text-accent"
        />
        <Typography.Heading type="h5" weight="bold" className="flex-1">
          Du har en inbjudan
        </Typography.Heading>
      </View>
      <Typography.Paragraph type="body-sm" color="muted">
        Inbjudan gäller ett annat hem. Du kan bara vara med i ett hem i taget —
        lämna {home.name} först om du vill byta.
      </Typography.Paragraph>
      <Button variant="tertiary" className="rounded-xl bg-field" onPress={clear}>
        <Typography.Paragraph type="body-sm">Avvisa</Typography.Paragraph>
      </Button>
    </Surface>
  );
};

export default PendingInviteBanner;
