import HomeHero from "@/features/home/components/home-hero";
import HomeMeals from "@/features/home/components/home-meals";
import HomeNeededIngredients from "@/features/home/components/home-needed-ingredients";
import HomeTopBar from "@/features/home/components/home-top-bar";
import PendingInviteBanner from "@/features/home/components/pending-invite-banner";
import { usePlannedMeals } from "@/features/plan/hooks/use-plan";
import { nextMeal, planRange } from "@/features/plan/plan-types";
import { shoppingListKeys } from "@/features/shopping-list/hooks/use-shopping-list";
import { today } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Spinner, Typography } from "heroui-native";
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

const HomeIndex = () => {
  const queryClient = useQueryClient();
  const [scrolled, setScrolled] = useState(false);

  // Hela planens intervall, inte bara idag: samma nyckel som veckoplanen, så
  // hemsidan delar dess cache och visar en ändring där direkt.
  const range = planRange();
  const meals = usePlannedMeals(range.from, range.to);

  const all = meals.data ?? [];
  const todays = all.filter((meal) => meal.date === today());

  // Eget tillstånd i stället för isRefetching, se receptlistan. Inköpsraden
  // längst ner har en egen fråga — den ska följa med i samma drag.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        meals.refetch(),
        queryClient.invalidateQueries({ queryKey: shoppingListKeys.all }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View className="flex-1 gap-0 pt-safe-offset-2">
      <HomeTopBar scrolled={scrolled} />
      <PendingInviteBanner />
      {meals.isPending ? (
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      ) : meals.isError ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Typography.Paragraph align="center" color="muted">
            Kunde inte hämta dagens måltider
          </Typography.Paragraph>
          <Button variant="secondary" onPress={() => meals.refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : (
        <ScrollView
          scrollEventThrottle={16}
          onScroll={(e) => {
            setScrolled(e.nativeEvent.contentOffset.y > 0);
          }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          }
        >
          <HomeHero next={nextMeal(all)} />
          <HomeMeals meals={todays} />
        </ScrollView>
      )}
      <HomeNeededIngredients />
    </View>
  );
};

export default HomeIndex;
