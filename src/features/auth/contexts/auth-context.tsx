import { parseRecoveryLink } from "@/lib/auth-links";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
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
  // The current password is verified before the change goes through. Pass null
  // only from the recovery flow, where the user by definition cannot supply it.
  updateUser: (
    newPassword: string,
    currentPassword: string | null,
  ) => Promise<void>;
  // True from the moment a recovery link is applied until the password has
  // actually been changed. Deliberately kept here rather than passed as a route
  // param — a crafted deep link could otherwise skip the current-password check.
  isRecoverySession: boolean;
  // Set when a recovery link could not be exchanged for a session, so the
  // guest screens can explain why nothing happened.
  recoveryError: string | null;
  clearRecoveryError: () => void;
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
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const url = Linking.useLinkingURL();

  // Resolves to true only when the URL actually was a recovery link and the
  // session was applied. Any other deep link resolves to false so it never
  // flips the recovery flag.
  const applyRecoveryLink = async (url: string) => {
    const tokens = parseRecoveryLink(url);
    if (!tokens) return false;

    const { error } = await supabase.auth.setSession(tokens);
    if (error) throw error;

    return true;
  };

  useEffect(() => {
    if (!url) return;

    applyRecoveryLink(url)
      .then((applied) => {
        if (applied) setIsRecoverySession(true);
      })
      .catch((error) => {
        // Recovery links are single-use and expire quickly, so this is the
        // failure users hit most often. Say so instead of leaving them on the
        // login screen wondering why the link did nothing.
        console.error("Recovery link could not be applied:", error);
        setRecoveryError(
          "Återställningslänken är ogiltig eller har gått ut. Begär en ny länk och försök igen.",
        );
      });
  }, [url]);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL("reset-password"),
      });
      if (error) throw error;
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
        updateUser,
        isRecoverySession,
        recoveryError,
        clearRecoveryError: () => setRecoveryError(null),
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
