import { useAuth } from "@/features/auth/contexts/auth-context";
import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import {
  APP_VERSION,
  openBugReport,
  openContact,
  PRIVACY_URL,
  TERMS_URL,
} from "@/lib/app-info";
import { StyledIonicons } from "@/utils/helpers";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Label, ListGroup, Separator, Typography } from "heroui-native";
import { ComponentProps } from "react";
import { Alert, ScrollView, View } from "react-native";

type IconName = ComponentProps<typeof StyledIonicons>["name"];

const ItemIcon = ({
  name,
  danger = false,
}: {
  name: IconName;
  danger?: boolean;
}) => (
  <ListGroup.ItemPrefix>
    <StyledIonicons
      name={name}
      size={24}
      className={danger ? "text-danger" : "text-foreground"}
    />
  </ListGroup.ItemPrefix>
);

const AccountIndex = () => {
  const auth = useAuth();
  const user = useAuthorizedUser();

  const confirmLogout = () =>
    Alert.alert("Logga ut?", "Du kan logga in igen när du vill.", [
      { text: "Avbryt", style: "cancel" },
      { text: "Logga ut", style: "destructive", onPress: () => auth.logout() },
    ]);

  return (
    <ScrollView contentContainerClassName="grow gap-6 px-4 py-6 pb-safe-offset-6">
      {/* ---- Profil ---- */}
      <View className="gap-2">
        <Label>Profil</Label>
        <ListGroup>
          <ListGroup.Item onPress={() => router.push("/account/edit-name")}>
            <ItemIcon name="person-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{user.name}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>Byt namn</ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={() => router.push("/account/change-email")}>
            <ItemIcon name="mail-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle numberOfLines={1}>
                {user.email}
              </ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Byt e-postadress
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>
      </View>

      {/* ---- Säkerhet ---- */}
      <View className="gap-2">
        <Label>Säkerhet</Label>
        <ListGroup>
          <ListGroup.Item onPress={() => router.push("/account/change-password")}>
            <ItemIcon name="lock-closed-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Byt lösenord</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Ändra ditt lösenord
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={confirmLogout}>
            <ItemIcon name="exit-outline" danger />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="text-danger">
                Logga ut
              </ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Avsluta din session
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </ListGroup>
      </View>

      {/* ---- Om Skaffa ---- */}
      <View className="gap-2">
        <Label>Om Skaffa</Label>
        <ListGroup>
          <ListGroup.Item onPress={() => openBugReport()}>
            <ItemIcon name="bug-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Rapportera ett fel</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Öppnar ett mejl med appversion och enhet ifyllt
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={openContact}>
            <ItemIcon name="chatbubble-ellipses-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Kontakta oss</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Frågor, idéer och önskemål
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          >
            <ItemIcon name="shield-checkmark-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Integritetspolicy</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
            <ItemIcon name="document-text-outline" />
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Användarvillkor</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>
        <Typography.Paragraph type="body-sm" color="muted" align="center">
          Skaffa version {APP_VERSION}
        </Typography.Paragraph>
      </View>

      {/* ---- Radera ---- */}
      <ListGroup>
        <ListGroup.Item onPress={() => router.push("/account/delete-account")}>
          <ItemIcon name="trash-outline" danger />
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle className="text-danger">
              Radera konto
            </ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              Tar bort ditt konto permanent
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix />
        </ListGroup.Item>
      </ListGroup>
    </ScrollView>
  );
};

export default AccountIndex;
