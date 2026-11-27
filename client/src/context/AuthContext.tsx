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
  SessionDto,
  ShopPermission,
  ShopRole,
  UpdateBusinessRequest,
  UserDto,
} from "@mizan/shared";
import { apiRequest, setStoredToken } from "../lib/api";
import { useLanguage } from "./LanguageContext";

const ALL_SHOP_PERMISSIONS: ShopPermission[] = [
  "sell",
  "record_expense",
  "edit_transaction",
  "void_transaction",
  "view_ledger",
  "view_reports",
  "manage_inventory",
  "manage_purchases",
  "manage_customers",
  "manage_staff",
  "manage_billing",
  "manage_settings",
  "view_audit",
];

interface AuthContextValue {
  user: UserDto | null;
  business: BusinessDto | null;
  shopRole: ShopRole;
  permissions: ShopPermission[];
  isLoading: boolean;
  can: (permission: ShopPermission) => boolean;
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
  const [shopRole, setShopRole] = useState<ShopRole>("OWNER");
  const [permissions, setPermissions] = useState<ShopPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setLanguage, applyAccountLanguage } = useLanguage();
  const queryClient = useQueryClient();

  const applyProfile = useCallback(
    (profile: SessionDto) => {
      setUser(profile.user);
      setBusiness(profile.business);
      setShopRole(profile.shopRole ?? "OWNER");
      setPermissions(
        profile.permissions?.length ? profile.permissions : ALL_SHOP_PERMISSIONS
      );
      applyAccountLanguage(profile.business.preferredLanguage);
    },
    [applyAccountLanguage]
  );

  const applySession = useCallback(
    (res: AuthResponse) => {
      setStoredToken(res.token);
      applyProfile(res);
    },
    [applyProfile]
  );

  useEffect(() => {
    let cancelled = false;
    apiRequest<SessionDto>("/auth/me")
      .then((profile) => {
        if (!cancelled) {
          applyProfile(profile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredToken(null);
          setUser(null);
          setBusiness(null);
          setPermissions([]);
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
  }, [applyProfile]);

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
    setShopRole("OWNER");
    setPermissions([]);
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
        shopRole,
        permissions,
        isLoading,
        can: (permission) => permissions.includes(permission),
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
