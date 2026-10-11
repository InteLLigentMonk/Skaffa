import { useAuth } from "@/features/auth/contexts/auth-context";
import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { StyledIonicons } from "@/utils/helpers";
import { router } from "expo-router";
import { Label, ListGroup, Separator } from "heroui-native";
import { ScrollView, View } from "react-native";

const AccountIndex = () => {
  const auth = useAuth();
  const user = useAuthorizedUser();

  return (
    <ScrollView contentContainerClassName="grow gap-6 px-4 py-6 pb-safe-offset-6">
      {/* ---- Profil ---- */}
      <View className="gap-2">
        <Label>Profil</Label>
        <ListGroup>
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <StyledIonicons
                name="person-outline"
                size={24}
                className="text-foreground"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{user.name}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription numberOfLines={1}>
                {user.email}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </ListGroup>
      </View>

      {/* ---- Säkerhet ---- */}
      <View className="gap-2">
        <Label>Säkerhet</Label>
        <ListGroup>
          <ListGroup.Item onPress={() => router.push("/account/change-password")}>
            <ListGroup.ItemPrefix>
              <StyledIonicons
                name="lock-closed-outline"
                size={24}
                className="text-foreground"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Byt lösenord</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Ändra ditt lösenord
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={() => auth.logout()}>
            <ListGroup.ItemPrefix>
              <StyledIonicons
                name="exit-outline"
                size={24}
                className="text-danger"
              />
            </ListGroup.ItemPrefix>
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
    </ScrollView>
  );
};

export default AccountIndex;
