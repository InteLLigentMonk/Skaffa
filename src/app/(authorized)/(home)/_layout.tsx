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
      <Stack.Screen name="manage-home" options={{ title: "Hantera hemmet" }} />
      <Stack.Screen name="invite-to-home" options={{ title: "Bjud in" }} />
    </Stack>
  );
};

export default HomeLayout;
