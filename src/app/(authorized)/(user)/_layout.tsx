import { Stack } from "expo-router";

const UserLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Användare", headerShown: false }}
      />
    </Stack>
  );
};

export default UserLayout;
