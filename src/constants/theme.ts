/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  primary: "rgba(233, 79, 55, 1)", // PrimaryScarlet
  secondary: "rgba(103, 111, 84, 1)", // Lavender Gray
  onPrimary: "hsl(0, 0%, 100%)",
  onSecondary: "hsl(0, 0%, 0%)",
  error: "rgba(220, 20, 60, 1)", // Crimson
  light: {
    text: "hsl(0, 0%, 0%)",
    textSecondary: "hsla(0, 0%, 0%, 0.6)",
    background: "hsla(113, 31%, 95%, 1)", // Mint Cream
    surface: "hsla(113, 31%, 85%, 1)",
    surfaceSelected: "hsla(0, 0%, 0%, 0.08)",
    border: "hsla(0, 0%, 0%, 0.12)",
  },
  dark: {
    text: "hsl(0, 0%, 100%)",
    textSecondary: "hsla(0, 0%, 100%, 0.60)",
    background: "hsl(221, 26%, 21%)", // Deep Space Blue
    surface: "hsl(220, 27%, 31%)",
    surfaceSelected: "hsla(0, 0%, 100%, 0.08)",
    border: "hsla(0, 0%, 100%, 0.12)",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
