import { AuthProvider, useAuth } from "@/features/auth/contexts/auth-context";
import { PendingInviteProvider } from "@/features/home/contexts/pending-invite-context";
import { useHome } from "@/features/home/hooks/use-home";
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack, ThemeProvider, useTheme } from "expo-router";
import * as SystemUI from "expo-system-ui";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

// Separate component so it can read the context that RootLayout provides.
const RootNavigator = () => {
  const { isAuthenticated, initializing, isRecoverySession } = useAuth();
  const homeQuery = useHome();
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const ready =
    (fontsLoaded || fontError) &&
    !initializing &&
    !(isAuthenticated && homeQuery.isPending);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  if (!ready) return null;

  const hasHome = !!homeQuery.data;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={isAuthenticated && !isRecoverySession && hasHome}>
        <Stack.Screen name="(authorized)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-recipe"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen name="create" />
        <Stack.Screen name="new-product" />
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
      <Stack.Protected
        guard={isAuthenticated && !isRecoverySession && !hasHome}
      >
        <Stack.Screen
          name="(no-home)"
          options={{ title: "Skapa hem", headerShown: false }}
        />
      </Stack.Protected>
    </Stack>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const navigationTheme = useNavigationTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <HeroUINativeProvider>
          <AuthProvider>
            {/* Utanför RootNavigator så en parkerad inbjudan överlever att
                guarden byter gren — både (guest) och (no-home) läser den. */}
            <PendingInviteProvider>
              <ThemeProvider value={navigationTheme}>
                <RootNavigator />
              </ThemeProvider>
            </PendingInviteProvider>
          </AuthProvider>
        </HeroUINativeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
