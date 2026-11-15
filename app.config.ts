import type { ConfigContext, ExpoConfig } from "expo/config";

// app.json är grunden (release-please skriver versionen där). Den här filen
// lägger bara på det som skiljer development-builden från den riktiga appen.
//
// Development-builden får ett eget paketnamn så att den kan ligga installerad
// bredvid preview-appen. Båda med nu.skaffa.app gick inte: Android ser dem som
// samma app och den ena ersätter den andra.
//
// APP_VARIANT sätts av development-profilen i eas.json och av PR-preview i
// .eas/workflows/pr-preview.yml. Variabeln påverkar fingerprinten, så en
// PR-uppdatering måste publiceras med samma variant som builden den ska köras i.
const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!IS_DEV) return config as ExpoConfig;

  return {
    ...config,
    name: "Skaffa (dev)",
    slug: config.slug ?? "Skaffa",
    // Eget schema så att skaffa://-länkar inte får två appar att välja mellan.
    scheme: "skaffa-dev",
    android: {
      ...config.android,
      package: "nu.skaffa.app.dev",
    },
  };
};
