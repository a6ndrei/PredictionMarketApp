import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { User} from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({ ...parsedUser, token });
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }

    setIsLoading(false);
  }, []);

  const refreshUser = async () => {
    if (!localStorage.getItem("auth_token")) return;
    try {
      const me = await api.getMe();
      if (me) {
        setUser((prev) => ({ ...prev, ...me }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      refreshUser();
      const interval = setInterval(refreshUser, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.token]);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("auth_token", newUser.token || "");
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      }),
    );
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
