import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const StyledIonicons = withUniwind(Ionicons);

type CreateHref = "/new-product" | "/new-recepie";

const Create = () => {
  const router = useRouter();

  // Stäng arket först — annars ligger det kvar och animerar bort ovanpå den
  // nya skärmen.
  const openScreen = (href: CreateHref) => {
    router.replace(href);
  };

  return (
    <View className="flex-1 gap-3 bg-overlay px-5 pt-4 pb-safe-offset-3">
      <Typography.Heading type="h3" weight="bold">
        Vad vill du skapa?
      </Typography.Heading>
      <Typography.Paragraph className="mb-3 text-muted">
        Lägg till en ny produkt i skafferiet eller ett nytt recept.
      </Typography.Paragraph>
      <Button onPress={() => openScreen("/new-product")}>
        <StyledIonicons
          name="nutrition-outline"
          size={20}
          className="text-accent-foreground"
        />
        <Button.Label>Produkt</Button.Label>
      </Button>
      <Button variant="secondary" onPress={() => openScreen("/new-recepie")}>
        <StyledIonicons
          name="library-outline"
          size={20}
          className="text-accent-soft-foreground"
        />
        <Button.Label>Recept</Button.Label>
      </Button>
    </View>
  );
};

export default Create;
