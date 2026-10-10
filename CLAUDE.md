# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Kommandon

```sh
npm start                 # expo start (dev server)
npm run android           # expo run:android — dev build, inte Expo Go
npm run ios               # expo run:ios
npm run web
npm run lint              # expo lint (eslint-config-expo + @tanstack/eslint-plugin-query)
npx tsc --noEmit          # typkontroll; det finns inget eget script
npm run gen:types         # regenererar src/lib/database.types.ts från det länkade projektet
npm run drain-storage     # tömmer storage_cleanup_queue (kräver service role i .env)
```

Det finns **inget testramverk** i projektet. Verifiera ändringar med `npm run lint`,
`npx tsc --noEmit` och genom att köra appen.

Databasarbete (migrationer, `db push`, `migration repair`, `db diff`) beskrivs i
[supabase/README.md](supabase/README.md) — läs den innan du rör schemat.

## Git-arbetsflöde

- **Ingen kodning på `main`.** Skapa en branch innan första filändringen:
  `git switch -c <typ>/<kort-beskrivning>`, t.ex. `feat/inkopslista-dela`.
  En hook ([guard-main.mjs](.claude/hooks/guard-main.mjs)) blockerar Edit/Write
  på `main`.
- **Conventional Commits:** `<typ>(<scope>): <beskrivning>` på svenska, gemen
  början, ingen punkt. Typer: `feat`, `fix`, `refactor`, `chore`, `docs`,
  `style`, `perf`. Scope är feature-mappen eller området (`recipes`, `home`,
  `auth`, `db`). Exempel ur historiken: `feat(recipes): dra nedåt för att
  uppdatera receptlistan`.
- Innan `git commit` kör en hook ([pre-commit-check.mjs](.claude/hooks/pre-commit-check.mjs))
  `npm run lint` och `npx tsc --noEmit`. Blockeras commiten: rätta felen, kringgå
  inte kontrollen.
- Commit, push och PR bara när användaren ber om det.

## Språk

Appens UI-text, commit-meddelanden och nyare kodkommentarer är på **svenska**.
Äldre kommentarer är på engelska; matcha filen du arbetar i. Identifierare är
engelska.

## Arkitektur

### Navigationsträdet är en tillståndsmaskin

[src/app/_layout.tsx](src/app/_layout.tsx) väljer gren med `Stack.Protected` utifrån tre
värden: `isAuthenticated`, `isRecoverySession` och om `useHome()` gav ett hem.
Grenarna är `(guest)`, `(no-home)`, `reset-password` och `(authorized)`.

Konsekvensen genomsyrar koden: **skärmar navigerar inte själva efter en mutation.**
Skapa hem, gå med, lämna hem — alla invaliderar bara query-cachen, och guarden
flyttar användaren när `useHome` refetchat. Lägger du till en `router.replace` efter
en sådan mutation tävlar den med guarden.

Splash-skärmen hålls kvar tills fonter, auth-init och hem-frågan är klara
(`ready` i `RootNavigator`). Därför är `removeQueries` på hem-nyckeln farligt —
se den långa kommentaren vid `discardHomeData` i
[use-home.ts](src/features/home/hooks/use-home.ts).

`(authorized)/_layout.tsx` är flikarna och lindar in `AuthorizedUserProvider`, som
ger `useAuthorizedUser()` en garanterat icke-null användare.

### Auth

All auth bor i [auth-context.tsx](src/features/auth/contexts/auth-context.tsx), ovanpå
`supabase.auth`. Två saker att veta:

- `isRecoverySession` ligger i context, inte som route-param, så en konstruerad
  deep link inte kan hoppa över kontrollen av nuvarande lösenord.
- `onAuthStateChange`-callbacken måste förbli synkron (att awaita Supabase-anrop
  i den låser auth-klienten), och den kör `queryClient.clear()` på `SIGNED_OUT`.

Deep links parsas i [auth-links.ts](src/lib/auth-links.ts). Inbjudningslänkar som
kommer in innan användaren är inloggad parkeras i
[pending-invite-context.tsx](src/features/home/contexts/pending-invite-context.tsx), som
sitter ovanför `RootNavigator` just för att överleva ett guard-byte.

### Feature-mappar

`src/features/<domän>/` med en fast form:

```
api.ts              rena supabase-anrop, kastar vid error, mappar snake_case → camelCase
<domän>-types.ts    app-nära typer (DB-typerna bor i src/lib/database.types.ts)
hooks/use-*.ts      <domän>Keys-objekt + useQuery/useMutation som wrappar api.ts
components/         feature-specifika komponenter
```

Query-nycklarna är hierarkiska så prefixinvalidering fungerar (`homeKeys.all`
träffar både `current` och `members`). Nycklar som bär privat data per konto
innehåller användar-id — se kommentaren i `homeKeys`.

`src/components/` är delade, domänlösa komponenter; `src/hooks/` detsamma.

### Databasen bestämmer

Schemat är inte en passiv lagring — invarianterna är kodade i Postgres och klienten
litar på dem:

- En användare tillhör **exakt ett hem** (`unique (user_id)` på `home_members`).
- Medlemskap skapas aldrig direkt av klienten, bara via `create_home()` och
  `redeem_invite()` (båda `security definer` och atomära).
- Grenval som annars skulle tävla mellan medlemmar (sista medlemmen, sista ägaren)
  ligger i RPC:er: `leave_home`, `delete_home`, `guard_last_owner`.
- Enheter: en ingrediens bär ett *måttslag* (`dimension`), inte en enhet. En trigger
  härleder `amount_base` till basenheten, så inköpslistan summerar med rak `sum()`.
  [src/lib/units.ts](src/lib/units.ts) speglar `unit_to_base()` i SQL — ändras den ena
  måste den andra följa med.

`src/lib/database.types.ts` är genererad (`npm run gen:types`) och lintignorerad —
redigera den aldrig för hand.

### Styling

Tre lager som ska hållas isär:

1. **className via Uniwind** (Tailwind v4 för React Native) — standardvägen.
2. **HeroUI Native-komponenter** (`Button`, `TextField`, `Typography`, `Surface` …)
   för allt UI. Temat ligger i [src/skaffa-theme.css](src/skaffa-theme.css) i OKLCH.
3. **`useTheme()`** ([src/hooks/use-theme.ts](src/hooks/use-theme.ts)) läser samma
   CSS-variabler som JS-värden — använd den **bara** där className inte når:
   React Navigations `screenOptions`, tab bar, råa RN-komponenter.
   `useNavigationTheme()` bygger React Navigations tema ur samma tokens.

`src/global.css` är entrypointen (importerad i rotlayouten och pekad ut i
`metro.config.js`).

### Formulär

`react-hook-form` med `Controller` runt HeroUI:s `TextField`. Serverfel läggs på
`setError("root", …)`, typiskt med en gren på `error.code === "P0001"` för att visa
RPC:ns egna `raise exception`-meddelanden och en generisk text för allt annat.

## Konventioner värda att veta

- Sökvägsalias: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- `experiments.typedRoutes` och `reactCompiler` är på i `app.json` — undvik manuell
  `useMemo`/`useCallback` om du inte mäter ett problem.
- Miljövariabler: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  i `.env` (gitignorerad). Service role-nyckeln används bara av `scripts/` och får
  aldrig `EXPO_PUBLIC_`-prefix.
- Projektet kräver en dev build (`expo-dev-client`), inte Expo Go.
- Kommentarerna i koden förklarar oftast *varför*, inte vad. De långa blocken
  (`discardHomeData`, `parseInviteLink`, `keyboardBehavior`) dokumenterar fällor
  någon redan gått i — läs dem innan du ändrar raden de sitter vid.
