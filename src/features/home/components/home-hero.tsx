import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { StyledIonicons } from "@/utils/helpers";
import { Image as ExpoImage } from "expo-image";
import { Button, Card, Chip, Typography } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);

export default function HomeHero() {
  const user = useAuthorizedUser();

  return (
    <View className="gap-2 p-4 pt-2">
      <Typography.Heading type="h2">
        Vad blir det idag, {user.name}?
      </Typography.Heading>

      <Card
        className="gap-2 rounded-3xl p-4"
        style={{
          experimental_backgroundImage:
            "radial-gradient(circle at 87% 20%, #f97316 0%, #15803d 50%)",
        }}
      >
        <View className="flex flex-row w-full justify-between gap-2">
          <View className="flex flex-col gap-2 flex-1">
            <View className="flex flex-row gap-2 items-center">
              <StyledIonicons
                name="time-outline"
                size={12}
                className="text-white opacity-70"
              />
              <Typography.Paragraph
                type="body-sm"
                weight="bold"
                className="text-green-200"
              >
                Härnäst - lunch
              </Typography.Paragraph>
            </View>

            <Typography.Heading
              type="h2"
              className="text-white flex-1"
              numberOfLines={2}
            >
              Korvstroganoff med ris
            </Typography.Heading>
          </View>
          <Image
            source={require("@/assets/images/korvstroganoff.jpg")}
            contentFit="cover"
            className="w-[35%] aspect-square self-center rounded-2xl"
          />
        </View>

        <View className="flex flex-row flex-wrap gap-2">
          <Chip size="lg" variant="primary" color="success">
            <StyledIonicons
              name="checkmark-circle-outline"
              size={16}
              className="text-green-700"
            />
            <Chip.Label>Allt hemma</Chip.Label>
          </Chip>
          <Chip size="lg" variant="soft">
            <StyledIonicons name="timer-outline" size={16} color="white" />
            <Chip.Label className="text-white">20 min</Chip.Label>
          </Chip>
          <Chip size="lg" variant="soft">
            <StyledIonicons name="people-outline" size={16} color="white" />
            <Chip.Label className="text-white">2 port.</Chip.Label>
          </Chip>
        </View>
        <Button
          variant="secondary"
          animation={{ highlight: { backgroundColor: { value: "#f8b178" } } }}
          size="lg"
          className="bg-secondary active:bg-secondary-100 text-stone-500"
        >
          <StyledIonicons name="book" size={16} className="text-stone-800" />
          <Typography.Paragraph weight="bold" className="text-stone-900">
            Se recept
          </Typography.Paragraph>
          <StyledIonicons name="arrow-forward" size={16} />
        </Button>
      </Card>
    </View>
  );
}
