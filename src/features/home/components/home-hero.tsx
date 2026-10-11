import { Emoji } from "@/components/emoji";
import { useAuthorizedUser } from "@/features/auth/contexts/authorized-user-context";
import { MEAL_SLOT_LABELS, PlannedMeal } from "@/features/plan/plan-types";
import { StyledIonicons } from "@/utils/helpers";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { Button, Card, Chip, Typography } from "heroui-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const Image = withUniwind(ExpoImage);

type Props = {
  /** Från nextMeal; null när inget är planerat idag eller i morgon. */
  next: { meal: PlannedMeal; isTomorrow: boolean } | null;
};

export default function HomeHero({ next }: Props) {
  const user = useAuthorizedUser();
  const router = useRouter();

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
        {next ? (
          <NextMeal
            meal={next.meal}
            isTomorrow={next.isTomorrow}
            onOpen={() =>
              router.push({
                pathname: "/recipe/[id]",
                params: { id: next.meal.recipeId, scope: "home" },
              })
            }
          />
        ) : (
          <NothingPlanned
            onPlan={() => router.navigate("/(authorized)/(plan)")}
          />
        )}
      </Card>
    </View>
  );
}

const NextMeal = ({
  meal,
  isTomorrow,
  onOpen,
}: {
  meal: PlannedMeal;
  isTomorrow: boolean;
  onOpen: () => void;
}) => (
  <>
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
            {isTomorrow ? "I morgon" : "Härnäst"} –{" "}
            {MEAL_SLOT_LABELS[meal.slot].toLowerCase()}
          </Typography.Paragraph>
        </View>

        <Typography.Heading
          type="h2"
          className="text-white flex-1"
          numberOfLines={2}
        >
          {meal.recipeName}
        </Typography.Heading>
      </View>
      {meal.imageUrl ? (
        <Image
          source={{ uri: meal.imageUrl, cacheKey: meal.imagePath ?? undefined }}
          contentFit="cover"
          transition={150}
          className="w-[35%] aspect-square self-center rounded-2xl"
        />
      ) : (
        <View className="w-[35%] aspect-square self-center items-center justify-center rounded-2xl bg-white/20">
          <Emoji size={40}>🍽️</Emoji>
        </View>
      )}
    </View>

    <View className="flex flex-row flex-wrap gap-2">
      {meal.prepMinutes !== null && (
        <Chip size="lg" variant="soft">
          <StyledIonicons name="timer-outline" size={16} color="white" />
          <Chip.Label className="text-white">{meal.prepMinutes} min</Chip.Label>
        </Chip>
      )}
      <Chip size="lg" variant="soft">
        <StyledIonicons name="people-outline" size={16} color="white" />
        <Chip.Label className="text-white">{meal.servings} port.</Chip.Label>
      </Chip>
    </View>

    <HeroButton icon="book" label="Se recept" onPress={onOpen} />
  </>
);

const NothingPlanned = ({ onPlan }: { onPlan: () => void }) => (
  <>
    <View className="gap-1">
      <Typography.Heading type="h3" className="text-white">
        Inget mer planerat idag
      </Typography.Heading>
      <Typography.Paragraph type="body-sm" className="text-green-100">
        Planera veckans måltider så får du inköpslistan på köpet.
      </Typography.Paragraph>
    </View>
    <HeroButton icon="calendar" label="Planera måltider" onPress={onPlan} />
  </>
);

const HeroButton = ({
  icon,
  label,
  onPress,
}: {
  icon: "book" | "calendar";
  label: string;
  onPress: () => void;
}) => (
  <Button
    variant="secondary"
    animation={{ highlight: { backgroundColor: { value: "#f8b178" } } }}
    size="lg"
    className="bg-secondary active:bg-secondary-100 text-stone-500"
    onPress={onPress}
  >
    <StyledIonicons name={icon} size={16} className="text-stone-800" />
    <Typography.Paragraph weight="bold" className="text-stone-900">
      {label}
    </Typography.Paragraph>
    <StyledIonicons name="arrow-forward" size={16} />
  </Button>
);
