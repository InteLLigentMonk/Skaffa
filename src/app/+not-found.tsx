import { Redirect } from "expo-router";

/**
 * Skyddsnät för deep links. En länk mot en rutt som ligger bakom en avstängd
 * Stack.Protected-guard matchar ingenting, och utan den här filen visar
 * expo-router sin inbyggda Unmatched-skärm. "/" går alltid till rätt ställe,
 * eftersom guarden avgör vilken grupp som är monterad.
 */
const NotFound = () => <Redirect href="/" />;

export default NotFound;
