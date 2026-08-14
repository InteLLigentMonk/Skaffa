/**
 * Läser Skaffas designtokens (definierade i src/skaffa-theme.css) som JS-värden.
 *
 * Använd bara den här hooken för sådant som INTE kan stylas med className —
 * React Navigation (Stack-header, tab bar) och råa RN-komponenter. Allt annat
 * ska styla sig via className, så att Uniwind sköter temaväxlingen.
 *
 * Värdena är reaktiva: uniwind renderar om när temat byts, och konverterar
 * OKLCH till hex vid bygget (RN:s färgparser förstår inte oklch()).
 */

import { useMemo } from "react";
import { useCSSVariable } from "uniwind";

/** Semantiskt namn → CSS-variabel i skaffa-theme.css */
const TOKENS = {
  text: "--foreground",
  textSecondary: "--muted",
  background: "--background",
  surface: "--surface",
  surfaceSelected: "--surface-secondary",
  border: "--border",
  primary: "--accent",
  onPrimary: "--accent-foreground",
  // Orange CTA. Motsvarar bg-secondary / text-secondary på className-sidan.
  secondary: "--secondary",
  onSecondary: "--secondary-foreground",
  error: "--danger",
} as const;

export type ThemeColor = keyof typeof TOKENS;

const NAMES = Object.keys(TOKENS) as ThemeColor[];
const VARIABLES = NAMES.map((name) => TOKENS[name]);

export function useTheme(): Record<ThemeColor, string> {
  const values = useCSSVariable(VARIABLES);

  return useMemo(
    () =>
      Object.fromEntries(
        // Fallback bara om en token saknas — uniwind varnar då i konsolen.
        NAMES.map((name, index) => [name, String(values[index] ?? "transparent")]),
      ) as Record<ThemeColor, string>,
    [values],
  );
}
