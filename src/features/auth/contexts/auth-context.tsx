import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

export type RegisterResult = {
  // With email confirmation enabled, Supabase does not report an existing
  // address as an error. It returns an obfuscated user with no identities.
  emailTaken: boolean;
  needsVerification: boolean;
};

type AuthState = {
  isAuthenticated: boolean;
  // True until the stored session has been read back on app start.
  initializing: boolean;
  loading: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<RegisterResult>;
  validateEmail: (email: string, token: string) => Promise<void>;
  resendSignupVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  // Byter återställningskoden från mejlet mot en session och slår på
  // isRecoverySession, så att guarden bara visar reset-password.
  verifyRecoveryCode: (email: string, token: string) => Promise<void>;
  // The current password is verified before the change goes through. Pass null
  // only from the recovery flow, where the user by definition cannot supply it.
  updateUser: (
    newPassword: string,
    currentPassword: string | null,
  ) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  // Skickar en kod till den nya adressen (och till den nuvarande om "Secure
  // email change" är på i Supabase). Adressen byts först när koden verifierats.
  requestEmailChange: (newEmail: string) => Promise<void>;
  resendEmailChange: (newEmail: string) => Promise<void>;
  // true när bytet är klart. false betyder att Supabase väntar på koden till
  // den andra adressen också.
  confirmEmailChange: (email: string, token: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
  // True from the moment a recovery code is verified until the password has
  // actually been changed. Deliberately kept here rather than passed as a route
  // param — a crafted deep link could otherwise skip the current-password check.
  isRecoverySession: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

const mapUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email ?? "",
  name: user.user_metadata.display_name,
  avatarUrl: user.user_metadata.avatar_url,
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const applySession = (session: Session | null) => {
      setUser(session?.user ? mapUser(session.user) : null);
      setIsAuthenticated(!!session);
    };

    // Fires INITIAL_SESSION on subscribe (with whatever session was restored
    // from AsyncStorage), then on every SIGNED_IN / SIGNED_OUT /
    // TOKEN_REFRESHED. Keep this callback synchronous — awaiting Supabase
    // calls inside it deadlocks the auth client.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);
      // Cachen håller det gamla hemmets privata data
      //  — recept och egna ingredienser under nycklar utan användar-id.
      //  Utan den här raden ser nästa användare som loggar in dem i 5 minuter (staleTime).
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (scope: "local" | "global" = "local") => {
    try {
      await supabase.auth.signOut({ scope });
    } finally {
      // onAuthStateChange normally clears this for us on SIGNED_OUT, but if
      // signOut throws we still want the user out of the app locally.
      setIsAuthenticated(false);
      setUser(null);
      setIsRecoverySession(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) throw error;

      const emailTaken = data.user?.identities?.length === 0;
      const needsVerification = !data.session && !emailTaken;

      if (data.user && !emailTaken) {
        setUser(mapUser(data.user));
      }
      // No session means email confirmation is pending
      setIsAuthenticated(!!data.session);

      return { emailTaken, needsVerification };
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = async (email: string, token: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendSignupVerification = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        email,
        type: "signup",
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      // Ingen redirectTo: mejlet bär en kod, inte en länk. En länk bar access-
      // och refresh-token i klartext i en skaffa://-URL, och på Android kan
      // vilken app som helst registrera samma scheme och fånga den.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyRecoveryCode = async (email: string, token: string) => {
    setLoading(true);
    // Flaggan sätts före verifyOtp. SIGNED_IN gör isAuthenticated sann så fort
    // sessionen finns, och sattes flaggan efteråt hann guarden rendera
    // (authorized) däremellan — inloggad utan att ha valt nytt lösenord.
    setIsRecoverySession(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "recovery",
      });
      if (error) throw error;
    } catch (error) {
      setIsRecoverySession(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (
    newPassword: string,
    currentPassword: string | null,
  ) => {
    setLoading(true);
    try {
      // Supabase accepts any valid session here, so a stolen unlocked phone
      // could otherwise change the password and lock the owner out. Re-signing
      // in proves the current password is known. Note this is a client-side
      // check only — it cannot stop a caller hitting the API directly.
      if (currentPassword !== null) {
        if (!user?.email) throw new Error("No email on the current session");

        const { error } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        // Surfaces as invalid_credentials, which only this call can produce.
        if (error) throw error;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      if (data.user) {
        setUser(mapUser(data.user));
      }
      // The link has served its purpose; drop back to the normal app.
      setIsRecoverySession(false);
    } finally {
      setLoading(false);
    }
  };

  // Metadatan är sanningen; triggern sync_profile_display_name speglar den
  // till profiles, som medlemslistan läser.
  const updateDisplayName = async (displayName: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) throw error;
    setUser(mapUser(data.user));
  };

  const requestEmailChange = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
  };

  const resendEmailChange = async (newEmail: string) => {
    const { error } = await supabase.auth.resend({
      email: newEmail,
      type: "email_change",
    });
    if (error) throw error;
  };

  const confirmEmailChange = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email_change",
    });
    if (error) throw error;

    // Med "Secure email change" påslaget accepteras första koden utan att
    // adressen byts — new_email står kvar tills båda koderna är inne.
    const { data: fresh, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const updated = fresh.user ?? data.user;
    if (updated) setUser(mapUser(updated));

    return !updated?.new_email;
  };

  // delete_account lämnar hemmet först (se migrationen) och raderar sedan
  // auth-användaren. Sessionen är ogiltig efteråt, så logga ut lokalt —
  // SIGNED_OUT rensar cachen och guarden flyttar till (guest).
  const deleteAccount = async () => {
    const { error } = await supabase.rpc("delete_account");
    if (error) throw error;
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        initializing,
        isAuthenticated,
        user,
        login,
        logout,
        register,
        validateEmail,
        resendSignupVerification,
        forgotPassword,
        verifyRecoveryCode,
        updateUser,
        updateDisplayName,
        requestEmailChange,
        resendEmailChange,
        confirmEmailChange,
        deleteAccount,
        isRecoverySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
