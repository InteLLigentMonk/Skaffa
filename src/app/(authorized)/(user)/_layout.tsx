import { Stack } from "expo-router";

const UserLayout = () => {
  return (
    <Stack screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen
        name="index"
        options={{ title: "Användare", headerShown: false }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: "Ändra lösenord" }}
      />
    </Stack>
  );
};

export default UserLayout;
