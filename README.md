# Skaffa

Matplanering för hushåll: gemensamma recept, veckoplan och inköpslista som
summerar ingredienserna åt dig. Expo (React Native) med Supabase som backend.

## Kom igång

```sh
npm install
npm run android   # dev build — appen kräver expo-dev-client, inte Expo Go
npm run ios
```

`.env` behöver `EXPO_PUBLIC_SUPABASE_URL` och `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Kontroller

```sh
npm run lint
npx tsc --noEmit
```

## Mer

- [CLAUDE.md](CLAUDE.md) — arkitektur, konventioner och git-arbetsflöde.
- [supabase/README.md](supabase/README.md) — schemat, migrationer och hur databasen ändras.
