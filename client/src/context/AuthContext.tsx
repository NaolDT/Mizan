import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  AuthResponse,
  BusinessDto,
  LoginRequest,
  RegisterRequest,
  UpdateBusinessRequest,
  UserDto,
} from "@mizan/shared";
import { apiRequest, setStoredToken } from "../lib/api";
import { useLanguage } from "./LanguageContext";

interface AuthContextValue {
  user: UserDto | null;
  business: BusinessDto | null;
  isLoading: boolean;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  updateBusiness: (input: UpdateBusinessRequest) => Promise<BusinessDto>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [business, setBusiness] = useState<BusinessDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setLanguage } = useLanguage();
  const queryClient = useQueryClient();

  const applySession = useCallback(
    (res: AuthResponse) => {
      setStoredToken(res.token);
      setUser(res.user);
      setBusiness(res.business);
      setLanguage(res.business.preferredLanguage);
    },
    [setLanguage]
  );

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ user: UserDto; business: BusinessDto }>("/auth/me")
      .then((profile) => {
        if (!cancelled) {
          setUser(profile.user);
          setBusiness(profile.business);
          setLanguage(profile.business.preferredLanguage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredToken(null);
          setUser(null);
          setBusiness(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setLanguage]);

  const login = async (input: LoginRequest) => {
    const res = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    queryClient.clear();
    applySession(res);
  };

  const register = async (input: RegisterRequest) => {
    const res = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    queryClient.clear();
    applySession(res);
  };

  const loginDemo = async () => {
    const res = await apiRequest<AuthResponse>("/auth/demo", {
      method: "POST",
    });
    queryClient.clear();
    applySession(res);
  };

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // Ignore network error on logout
    }
    setStoredToken(null);
    setUser(null);
    setBusiness(null);
    queryClient.clear();
  };

  const updateBusiness = async (input: UpdateBusinessRequest) => {
    const updated = await apiRequest<BusinessDto>("/businesses/current", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    setBusiness(updated);
    setLanguage(updated.preferredLanguage);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isLoading,
        login,
        register,
        loginDemo,
        logout,
        updateBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
