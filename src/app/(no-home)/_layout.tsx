import { Stack } from "expo-router";

const NoHomeLayout = () => {
  return (
    <Stack screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create-home" options={{ title: "Skapa hem" }} />
      <Stack.Screen name="join" options={{ title: "Gå med i ett hem" }} />
    </Stack>
  );
};

export default NoHomeLayout;
