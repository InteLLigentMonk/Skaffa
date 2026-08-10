import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

export type RegisterResult = {
  // With email confirmation enabled, Supabase does not report an existing
  // address as an error. It returns an obfuscated user with no identities.
  emailTaken: boolean;
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

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      // onAuthStateChange normally clears this for us on SIGNED_OUT, but if
      // signOut throws we still want the user out of the app locally.
      setIsAuthenticated(false);
      setUser(null);
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

      if (data.user && !emailTaken) {
        setUser(mapUser(data.user));
      }
      // No session means email confirmation is pending
      setIsAuthenticated(!!data.session);

      return { emailTaken };
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = async (email: string, token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
    } catch (error) {
      console.error("Email validation failed:", error);
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
