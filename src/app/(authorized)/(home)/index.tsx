import { useAuth } from "@/features/auth/contexts/auth-context";
import HomeHero from "@/features/home/components/home-hero";
import HomeMeals from "@/features/home/components/home-meals";
import HomeNeededIngredients from "@/features/home/components/home-needed-ingredients";
import HomeTopBar from "@/features/home/components/home-top-bar";
import { useState } from "react";
import { ScrollView, View } from "react-native";

const index = () => {
  const [scrolled, setScrolled] = useState(false);

  const auth = useAuth();

  return (
    <View className="flex-1 gap-0 pt-safe-offset-2">
      <HomeTopBar scrolled={scrolled} />
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

export default index;
