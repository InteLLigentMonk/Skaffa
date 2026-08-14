import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { useNavigationTheme } from "@/hooks/use-navigation-theme";
import { Stack, ThemeProvider } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

// Separate component so it can read the context that RootLayout provides.
const RootNavigator = () => {
  const { isAuthenticated, initializing, isRecoverySession } = useAuth();

  // Avoid flashing the login screen while the stored session is restored.
  if (initializing) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={isAuthenticated && !isRecoverySession}>
        <Stack.Screen name="(authorized)" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* A recovery link takes over the entire app until a new password is
          set, so the user cannot tab away while the old one is still valid. */}
      <Stack.Protected guard={isAuthenticated && isRecoverySession}>
        <Stack.Screen
          name="reset-password"
          options={{ title: "Välj nytt lösenord" }}
        />
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
  const navigationTheme = useNavigationTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <AuthProvider>
          <ThemeProvider value={navigationTheme}>
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
