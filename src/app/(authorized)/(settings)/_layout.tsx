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
    </Stack>
  );
};

export default SettingsLayout;
