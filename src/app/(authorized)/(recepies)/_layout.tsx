import { Stack } from "expo-router";

const RecepiesLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Recept", headerShown: false }}
      />
      <Stack.Screen
        name="new-recepie"
        options={{
          title: "Nytt Recept",
        }}
      />
    </Stack>
  );
};

export default RecepiesLayout;
