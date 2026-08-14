import { Stack } from "expo-router";

const HomeLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="create-home" />
      <Stack.Screen name="invite-to-home" />
    </Stack>
  );
};

export default HomeLayout;
