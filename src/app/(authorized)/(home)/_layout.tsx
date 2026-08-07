import { useTheme } from "@/hooks/use-theme";
import { Stack } from "expo-router";

const HomeLayout = () => {
  const theme = useTheme();
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
