// src/contexts/authorized-user-context.tsx
import { useAuth, type AuthUser } from "@/features/auth/contexts/auth-context";
import { createContext, PropsWithChildren, useContext } from "react";

const AuthorizedUserContext = createContext<AuthUser | null>(null);

export const AuthorizedUserProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();

  // Under utloggning hinner user bli null innan de skyddade skärmarna
  // avmonteras. Rendera inget i det glappet i stället för att krascha.
  if (!user) return null;

  return (
    <AuthorizedUserContext.Provider value={user}>
      {children}
    </AuthorizedUserContext.Provider>
  );
};

export const useAuthorizedUser = (): AuthUser => {
  const user = useContext(AuthorizedUserContext);
  if (!user) {
    throw new Error("useAuthorizedUser måste användas inuti (authorized)");
  }
  return user;
};
