import { createContext, useContext, useState, type ReactNode } from "react";

export interface MockUser {
  name: string;
  email: string;
  role: "user" | "owner";
  initials: string;
}

interface AuthContextValue {
  user: MockUser | null;
  login: (user?: MockUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "bookmyroom-mock-auth";

// Default mock user — used when "login" is clicked without form details
const defaultUser: MockUser = {
  name: "Ram Bahadur",
  email: "ram@example.com",
  role: "user",
  initials: "RB",
};

function readStored(): MockUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit — start logged in so students see the full app
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
      return defaultUser;
    }
    if (raw === "logged-out") return null;
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(readStored);

  const login = (nextUser?: MockUser) => {
    const finalUser = nextUser ?? defaultUser;
    setUser(finalUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.setItem(STORAGE_KEY, "logged-out");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
