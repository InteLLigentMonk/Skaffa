import { useShoppingList } from "@/features/shopping-list/hooks/use-shopping-list";
import { isNeeded } from "@/features/shopping-list/shopping-list-types";
import { today, weekMonday } from "@/lib/dates";
import { StyledIonicons } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { Typography } from "heroui-native/text";
import { View } from "react-native";

// Samma fråga och nyckel som Lista-fliken på innevarande vecka, så siffrorna
// här följer med när man bockar av där.
const HomeNeededIngredients = () => {
  const router = useRouter();
  const list = useShoppingList(weekMonday(today()));

  // Inget alls hellre än en rad som blinkar från "ingen lista" till siffror.
  if (list.isPending || list.isError) return null;

  const needed = (list.data?.items ?? []).filter(isNeeded);
  const left = needed.filter((item) => !item.checked).length;

  const [title, subtitle] = !list.data?.generatedAt
    ? ["Ingen inköpslista än", "Skapa den från veckoplanen."]
    : left === 0
      ? ["Allt är handlat", `${needed.length} varor den här veckan.`]
      : [
          `${left} ${left === 1 ? "vara" : "varor"} kvar att handla`,
          `av ${needed.length} den här veckan.`,
        ];

  return (
    <PressableFeedback
      onPress={() => router.navigate("/(authorized)/(shopping-list)")}
    >
      <View className="flex flex-row items-center justify-between border-t light:border-orange-600 dark:border-orange-400 p-4 light:bg-orange-100 dark:bg-orange-950">
        <View>
          <Typography.Heading
            type="h5"
            weight="bold"
            className="dark:text-orange-400 light:text-orange-600"
          >
            {title}
          </Typography.Heading>
          <Typography.Paragraph
            type="body-sm"
            className="dark:text-orange-400 light:text-orange-600"
          >
            {subtitle}
          </Typography.Paragraph>
        </View>
        <StyledIonicons
          name="chevron-forward"
          size={24}
          className="dark:text-orange-400 light:text-orange-600"
        />
      </View>
    </PressableFeedback>
  );
};

export default HomeNeededIngredients;
