import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

// Separate component so it can read the context that RootLayout provides.
const RootNavigator = () => {
  const { isAuthenticated, initializing } = useAuth();

  // Avoid flashing the login screen while the stored session is restored.
  if (initializing) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(authorized)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen
          name="(guest)"
          options={{ title: "Registrera dig", headerShown: false }}
        />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <AuthProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? darkTheme : lightTheme}
          >
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
