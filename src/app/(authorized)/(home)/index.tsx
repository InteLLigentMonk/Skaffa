import HomeHero from "@/features/home/components/home-hero";
import HomeMeals from "@/features/home/components/home-meals";
import HomeNeededIngredients from "@/features/home/components/home-needed-ingredients";
import HomeTopBar from "@/features/home/components/home-top-bar";
import PendingInviteBanner from "@/features/home/components/pending-invite-banner";
import { useState } from "react";
import { ScrollView, View } from "react-native";

const HomeIndex = () => {
  const [scrolled, setScrolled] = useState(false);

  return (
    <View className="flex-1 gap-0 pt-safe-offset-2">
      <HomeTopBar scrolled={scrolled} />
      <PendingInviteBanner />
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => {
          setScrolled(e.nativeEvent.contentOffset.y > 0);
        }}
      >
        <HomeHero />
        <HomeMeals />
      </ScrollView>
      <HomeNeededIngredients />
    </View>
  );
};

export default HomeIndex;
