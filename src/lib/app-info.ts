import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import { Alert, Platform } from "react-native";

// Platshållare — fyll i innan release. Integritetspolicyn krävs av både
// App Store och Google Play eftersom appen har konton.
export const SUPPORT_EMAIL = "support@example.com";
export const PRIVACY_URL = "https://example.com/integritet";
export const TERMS_URL = "https://example.com/villkor";

export const APP_VERSION = Constants.expoConfig?.version ?? "okänd";

// Det vi alltid vill veta om en buggrapport, och som användaren aldrig vet.
const deviceSummary = () =>
  [
    `Skaffa ${APP_VERSION}`,
    `${Platform.OS} ${Platform.Version}`,
    Device.modelName ?? "okänd enhet",
  ].join(" · ");

const openMail = async (subject: string, body: string) => {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  try {
    await Linking.openURL(url);
  } catch {
    // Ingen mejlapp installerad. Visa adressen så den går att skriva av.
    Alert.alert(
      "Kunde inte öppna mejlappen",
      `Skicka gärna ett mejl till ${SUPPORT_EMAIL}.`,
    );
  }
};

export const openBugReport = (errorMessage?: string) =>
  openMail(
    "Felrapport – Skaffa",
    [
      "Beskriv vad som hände och vad du gjorde precis innan:",
      "",
      "",
      "---",
      deviceSummary(),
      ...(errorMessage ? [`Fel: ${errorMessage}`] : []),
    ].join("\n"),
  );

export const openContact = () =>
  openMail("Fråga om Skaffa", `\n\n---\n${deviceSummary()}`);
