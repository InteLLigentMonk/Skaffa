/**
 * Bygger React Navigations tema från Skaffas designtokens.
 *
 * Stack-headern och tab baren tar inte className — de konfigureras via det här
 * temat (och via screenOptions). Genom att läsa samma CSS-variabler som
 * className-lagret får navigationen och HeroUI-komponenterna samma palett.
 */

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { DarkTheme, DefaultTheme } from "expo-router";
import { useMemo } from "react";

export function useNavigationTheme() {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  return useMemo(() => {
    // Basen avgör icke-färgade detaljer (fonts, `dark`-flaggan som styr
    // statusfältets och native-headerns ljusa/mörka utseende).
    const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.primary,
        background: theme.background,
        card: theme.surface,
        text: theme.text,
        border: theme.border,
        notification: theme.error,
      },
    };
  }, [theme, colorScheme]);
}
