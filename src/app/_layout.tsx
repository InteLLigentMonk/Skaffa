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
import { openBugReport } from "@/lib/app-info";
import {
  SplashScreen,
  Stack,
  ThemeProvider,
  useTheme,
  type ErrorBoundaryProps,
} from "expo-router";
import * as SystemUI from "expo-system-ui";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
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
          name="recipe-form"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* A recovery code takes over the entire app until a new password is
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

// Fångar render-fel i hela appen. Ersätter RootLayout när den kastar, så inga
// providers finns här — därför råa RN-komponenter och inte HeroUI, som
// behöver HeroUINativeProvider. className fungerar ändå (Uniwind är global).
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 justify-center gap-4 bg-background p-8 pt-safe-offset-8 pb-safe-offset-8">
      <Text className="text-center text-2xl font-bold text-foreground">
        Något gick fel
      </Text>
      <Text className="text-center text-muted">
        Appen stötte på ett oväntat fel. Försök igen, och berätta gärna för oss
        vad som hände så vi kan rätta det.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        className="items-center rounded-2xl bg-accent px-4 py-3"
      >
        <Text className="font-semibold text-accent-foreground">Försök igen</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => openBugReport(error.message)}
        className="items-center rounded-2xl px-4 py-3"
      >
        <Text className="text-foreground">Rapportera felet</Text>
      </Pressable>
    </View>
  );
}

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
        {/* Auth ovanför HeroUINativeProvider: den äger portalvärden, så
            innehåll i BottomSheet/Menu/Popover.Portal monteras där och ser
            bara providers som ligger ovanför den. Ett ark som anropar useHome
            (t.ex. RecipePicker) kraschade annars med "useAuth must be used
            within an AuthProvider". Samma sak gäller allt under
            (authorized)/_layout — useAuthorizedUser fungerar inte i en portal. */}
        <AuthProvider>
          {/* Utanför RootNavigator så en parkerad inbjudan överlever att
              guarden byter gren — både (guest) och (no-home) läser den. */}
          <PendingInviteProvider>
            <HeroUINativeProvider>
              <ThemeProvider value={navigationTheme}>
                <RootNavigator />
              </ThemeProvider>
            </HeroUINativeProvider>
          </PendingInviteProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
