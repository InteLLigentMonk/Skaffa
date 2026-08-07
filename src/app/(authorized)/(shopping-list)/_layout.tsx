import { Stack } from "expo-router";

const ShoppingListLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Shopping Lista", headerShown: false }}
      />
    </Stack>
  );
};

export default ShoppingListLayout;
