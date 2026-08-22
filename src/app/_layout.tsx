import { AuthProvider, useAuth } from "@/features/auth/contexts/auth-context";
import { useNavigationTheme } from "@/hooks/use-navigation-theme";
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
} from "@expo-google-fonts/fredoka";
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { SplashScreen, Stack, ThemeProvider, useTheme } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

// Separate component so it can read the context that RootLayout provides.
const RootNavigator = () => {
  const { isAuthenticated, initializing, isRecoverySession } = useAuth();

  const theme = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  // Avoid flashing the login screen while the stored session is restored.
  if (initializing) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
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
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
