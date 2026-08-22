import { useAuth } from "@/features/auth/contexts/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Label, ListGroup, Separator } from "heroui-native";
import { ScrollView } from "react-native";
import { withUniwind } from "uniwind";

const StyledIonicons = withUniwind(Ionicons);

const index = () => {
  const auth = useAuth();

  return (
    <ScrollView contentContainerClassName="grow gap-4 p-safe-offset-8">
      <Label>Användare</Label>
      <ListGroup>
        <ListGroup.Item onPress={() => router.push("/change-password")}>
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
              className="text-foreground"
            />
          </ListGroup.ItemPrefix>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Logga ut</ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              Avsluta din session
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix />
        </ListGroup.Item>
      </ListGroup>
    </ScrollView>
  );
};

export default index;
