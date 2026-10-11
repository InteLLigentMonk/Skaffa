import { Stack } from "expo-router";

const SettingsLayout = () => {
  return (
    <Stack screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Inställningar", headerShown: false }}
      />
      <Stack.Screen name="manage-home" options={{ title: "Hantera hemmet" }} />
      <Stack.Screen name="invite-to-home" options={{ title: "Bjud in" }} />
      <Stack.Screen name="meal-slots" options={{ title: "Måltider per dag" }} />
      <Stack.Screen
        name="standing-meals"
        options={{ title: "Stående måltider" }}
      />
      {/* Titeln sätts av skärmen: ny eller ändra. */}
      <Stack.Screen name="standing-meal" />
    </Stack>
  );
};

export default SettingsLayout;
