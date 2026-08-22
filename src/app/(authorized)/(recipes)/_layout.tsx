import { Stack } from "expo-router";

const RecipesLayout = () => {
  return (
    <Stack screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Recept", headerShown: false }}
      />
      <Stack.Screen name="new-recipe" options={{ title: "Nytt recept" }} />
    </Stack>
  );
};

export default RecipesLayout;
