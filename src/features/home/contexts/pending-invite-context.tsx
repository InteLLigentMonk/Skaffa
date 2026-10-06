import { parseInviteLink } from "@/lib/auth-links";
import * as Linking from "expo-linking";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";

type PendingInviteState = {
  // Token från en join-länk som ännu inte lösts in. Parkeras här därför att
  // guarden i root-layouten avvisar navigeringen om mottagaren inte är
  // inloggad, och expo-router garanterar inte att försöket spelas om när
  // guarden senare blir sann.
  token: string | null;
  clear: () => void;
};

const PendingInviteContext = createContext<PendingInviteState | null>(null);

export const PendingInviteProvider = ({ children }: PropsWithChildren) => {
  const url = Linking.useLinkingURL();
  // Bara den avvisade token lagras, inte den aktiva. Den aktiva deriveras ur
  // url vid render — den bor redan i ett externt system (länkningen), och att
  // spegla den i state hade krävt en effekt som sätter state, med
  // omrenderingarna det drar med sig.
  const [dismissed, setDismissed] = useState<string | null>(null);

  const parsed = url ? parseInviteLink(url) : null;
  const token = parsed && parsed !== dismissed ? parsed : null;

  return (
    <PendingInviteContext.Provider
      value={{ token, clear: () => setDismissed(parsed) }}
    >
      {children}
    </PendingInviteContext.Provider>
  );
};

export const usePendingInvite = () => {
  const context = useContext(PendingInviteContext);
  if (!context) {
    throw new Error(
      "usePendingInvite must be used within a PendingInviteProvider",
    );
  }
  return context;
};
