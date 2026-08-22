import { Stack } from "expo-router";

const PlanLayout = () => {
  return (
    <Stack>
      {/* new-recepie bor i rot-stacken, se app/_layout — samma skäl som för
          new-product. */}
      <Stack.Screen
        name="index"
        options={{ title: "Veckoplan", headerShown: false }}
      />
    </Stack>
  );
};

export default PlanLayout;
